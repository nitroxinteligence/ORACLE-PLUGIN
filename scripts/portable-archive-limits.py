"""Import-facing archive limits, independent of runtime payload compression."""
import stat
import unicodedata
import zipfile

MAX_ARCHIVE_BYTES = 100_000_000
MAX_MEMBER_BYTES = 100 * 1024 * 1024
MAX_EXPANDED_BYTES = 512 * 1024 * 1024
MAX_ENTRIES = 5000


def validate_archive_members(entries):
    if not entries or len(entries) > MAX_ENTRIES:
        raise ValueError('archive_entry_count')
    seen, expanded, maximum = set(), 0, 0
    for entry in entries:
        path = entry.filename
        parts = path.rstrip('/').split('/')
        if (path != path.strip() or path.startswith('/') or '\\' in path
                or any(part in ('', '.', '..') for part in parts) or len(parts) > 20):
            raise ValueError('archive_member_path_invalid: ' + path)
        normalized = unicodedata.normalize('NFC', path).casefold()
        if normalized in seen:
            raise ValueError('archive_member_normalization_collision: ' + path)
        seen.add(normalized)
        kind = stat.S_IFMT(entry.external_attr >> 16)
        if kind not in (0, stat.S_IFREG, stat.S_IFDIR):
            raise ValueError('archive_member_type_unsupported: ' + path)
        if entry.file_size > MAX_MEMBER_BYTES:
            raise ValueError('archive_member_too_large: ' + path)
        if entry.flag_bits & 1 or entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
            raise ValueError('archive_member_unreadable: ' + path)
        expanded += entry.file_size
        maximum = max(maximum, entry.file_size)
    if expanded > MAX_EXPANDED_BYTES:
        raise ValueError('archive_uncompressed_too_large')
    return {'entries': len(entries), 'expandedBytes': expanded, 'maxMemberBytes': maximum}


def validate_archive(path):
    if path.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError('archive_too_large')
    with zipfile.ZipFile(path) as archive:
        result = validate_archive_members(archive.infolist())
        if archive.testzip():
            raise ValueError('archive_crc_failed')
    return {**result, 'compressedBytes': path.stat().st_size}
