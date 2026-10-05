"""Bounded streaming compression using the reviewed JavaScript runtime."""
import contextlib
import gzip
import subprocess


@contextlib.contextmanager
def compressed(path, brotli, executable):
    with path.open('wb') as output:
        if not brotli:
            with gzip.GzipFile(filename='', fileobj=output, mode='wb', compresslevel=9, mtime=0) as stream:
                yield stream
            return
        if not executable:
            raise ValueError('brotli_runtime_required')
        code = "process.stdin.pipe(require('node:zlib').createBrotliCompress({params:{[require('node:zlib').constants.BROTLI_PARAM_QUALITY]:6,[require('node:zlib').constants.BROTLI_PARAM_LGWIN]:24}})).pipe(process.stdout)"
        process = subprocess.Popen([str(executable), '-e', code], stdin=subprocess.PIPE, stdout=output, stderr=subprocess.PIPE)
        try:
            yield process.stdin
            process.stdin.close()
            error_text = process.stderr.read()
            if process.wait():
                raise ValueError('brotli_encode_failed: ' + error_text.decode(errors='replace'))
        finally:
            if process.poll() is None:
                process.kill()
            process.wait()
            process.stderr.close()
