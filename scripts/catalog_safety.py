"""Conservative publication preflight. Findings never expose matching values.

These checks catch common credential formats, not all possible private data.
A clean result still requires the publisher's content and license review.
"""
import re
import hashlib
from collections import Counter

RULES = (
    ('private-key-material', re.compile(rb'-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----')),
    ('github-credential', re.compile(rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b')),
    ('provider-credential', re.compile(rb'\bsk-(?:proj-|ant-api[0-9]+-)?[A-Za-z0-9_-]{32,}\b')),
    ('cloud-access-id', re.compile(rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b')),
)


def publication_rule_counts(data: bytes) -> dict:
    return dict(Counter({name: len(list(pattern.finditer(data))) for name, pattern in RULES if pattern.search(data)}))


def check_publication_bytes(path: str, data: bytes, reviewed_examples=None) -> None:
    counts = publication_rule_counts(data)
    if not counts:
        return
    review = (reviewed_examples or {}).get(hashlib.sha256(data).hexdigest(), {})
    # Explicit review binds the complete file, all rule counts and a reason. It
    # cannot apply to changed bytes or act as a directory/pattern allowlist.
    if (review.get('classification') in {'documented-public-example', 'nonfunctional-test-fixture'}
            and isinstance(review.get('reason'), str) and 0 < len(review['reason'].strip()) <= 1000
            and review.get('rule_counts') == counts):
        # Even a review cannot approve a PEM block carrying plausible key bytes.
        key_material = re.search(rb'-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----\s*[A-Za-z0-9+/=\r\n]{64,}', data)
        if not key_material:
            return
    raise ValueError('Publication preflight blocked ' + path + ' (' + ','.join(sorted(counts)) + ')')
