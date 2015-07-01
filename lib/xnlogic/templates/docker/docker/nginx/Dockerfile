FROM nginx:1.9.2
MAINTAINER Darrick Wiebe dw@xnlogic.com

# Install/update certificates
RUN apt-get update \
 && apt-get install -y -q --no-install-recommends \
    ca-certificates \
    wget \
 && apt-get clean \
 && rm -r /var/lib/apt/lists/*

RUN wget https://github.com/jwilder/dockerize/releases/download/v0.0.2/dockerize-linux-amd64-v0.0.2.tar.gz \
  && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-v0.0.2.tar.gz \
  && rm dockerize-linux-amd64-v0.0.2.tar.gz

# Configure Nginx and apply fix for very long server names
RUN echo "daemon off;" >> /etc/nginx/nginx.conf \
 && sed -i 's/^http {/&\n    server_names_hash_bucket_size 128;/g' /etc/nginx/nginx.conf

RUN mkdir -p /etc/nginx/conf.d /etc/nginx/certs

COPY . /app/
WORKDIR /app/

VOLUME ["/etc/nginx/certs"]

CMD dockerize -template /app/nginx.tmpl:/etc/nginx/conf.d/default.conf -stdout /var/log/nginx/access.log -stderr /var/log/nginx/error.log nginx
