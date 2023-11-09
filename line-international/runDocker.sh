docker build --pull -t file-server .
docker run -d --rm --init --ulimit memlock=-1:-1 --name file-server-container -p 3000:3000 file-server