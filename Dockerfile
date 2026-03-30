FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY game.js /usr/share/nginx/html/game.js
EXPOSE 80
