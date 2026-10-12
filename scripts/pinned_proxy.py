import socket, threading, sys

HOST, PORT = '127.0.0.1', 8788
PINNED = {'github.com': '140.82.112.3'}

def pipe(a, b):
    try:
        while True:
            data = a.recv(65536)
            if not data:
                break
            b.sendall(data)
    except OSError:
        pass
    finally:
        for s in (a, b):
            try:
                s.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass

def handle(client):
    try:
        req = b''
        while b'\r\n\r\n' not in req:
            chunk = client.recv(4096)
            if not chunk:
                return
            req += chunk
        line = req.split(b'\r\n', 1)[0].decode('utf-8', 'replace')
        parts = line.split()
        if len(parts) >= 2 and parts[0].upper() == 'CONNECT':
            target = parts[1]
            host, port = target.rsplit(':', 1)
            ip = PINNED.get(host, host)
            upstream = socket.create_connection((ip, int(port)), timeout=15)
            client.sendall(b'HTTP/1.1 200 Connection Established\r\n\r\n')
            t = threading.Thread(target=pipe, args=(client, upstream), daemon=True)
            t.start()
            pipe(upstream, client)
        else:
            client.sendall(b'HTTP/1.1 405 Method Not Allowed\r\n\r\n')
    except OSError:
        pass
    finally:
        try:
            client.close()
        except OSError:
            pass

srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind((HOST, PORT))
srv.listen(50)
print(f'pinned-proxy on {HOST}:{PORT}', flush=True)
while True:
    c, _ = srv.accept()
    threading.Thread(target=handle, args=(c,), daemon=True).start()
