# Bundle static assets with nginx
FROM nginx:1.23.2-alpine as react-fan-answer
ENV NODE_ENV production
# Copy bui lt assets from `builder` image
COPY /dist /usr/share/nginx/html
# Add your nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Start nginx
CMD sed -i -e 's/$PORT/'"$PORT"'/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'