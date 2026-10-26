"""HWP(한글 5.x) 파일에서 본문 글자만 뽑는다. 사용법: python3 -I scripts/hwp2txt.py 파일.hwp

- 표 안 글자도 문단 단위로 나온다(표 모양은 사라짐).
- 배포용(암호화) 문서는 읽지 못하고 미리보기 글자(PrvText)만 낸다.
- 필요한 것: olefile (pip install olefile)
"""
import struct
import sys
import zlib

import olefile

PARA_TEXT = 67


def para_text(data):
    out, i = [], 0
    while i + 1 < len(data):
        ch = struct.unpack_from('<H', data, i)[0]
        if ch in (0, 10, 13):
            out.append('\n' if ch in (10, 13) else '')
            i += 2
        elif ch < 32:
            # 확장·인라인 컨트롤 문자는 16바이트(문자 8개) 차지. 탭(9)은 공백으로
            if ch == 9:
                out.append('\t')
            i += 16 if ch not in (10, 13, 24, 25, 26, 27, 28, 29, 30, 31) else 2
        else:
            out.append(chr(ch))
            i += 2
    # 이모지 등 서로게이트 쌍을 제대로 합침
    return ''.join(out).encode('utf-16-le', 'surrogatepass').decode('utf-16-le', 'replace')


def section_text(raw, compressed):
    data = zlib.decompress(raw, -15) if compressed else raw
    i, lines = 0, []
    while i + 4 <= len(data):
        header = struct.unpack_from('<I', data, i)[0]
        tag, size = header & 0x3FF, (header >> 20) & 0xFFF
        i += 4
        if size == 0xFFF:
            size = struct.unpack_from('<I', data, i)[0]
            i += 4
        if tag == PARA_TEXT:
            lines.append(para_text(data[i:i + size]).strip())
        i += size
    return '\n'.join(x for x in lines if x)


def main(path):
    ole = olefile.OleFileIO(path)
    flags = struct.unpack_from('<I', ole.openstream('FileHeader').read(), 36)[0]
    compressed, distributed = bool(flags & 1), bool(flags & 4)
    if distributed:
        prv = ole.openstream('PrvText').read().decode('utf-16le', 'ignore') if ole.exists('PrvText') else ''
        print('[배포용 문서 — 미리보기 글자만]\n' + prv)
        return
    sections = sorted((e for e in ole.listdir() if e[0] == 'BodyText'), key=lambda e: int(e[1].replace('Section', '') or 0))
    print('\n'.join(section_text(ole.openstream(e).read(), compressed) for e in sections))


if __name__ == '__main__':
    main(sys.argv[1])
