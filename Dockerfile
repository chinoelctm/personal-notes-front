# Etapa de construcción
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Reusar capa de angular CLI
RUN npm install -g @angular/cli@17

# Copiar solo el lock de dependencias
COPY package-lock.json /usr/src/app/package-lock.json
COPY package.json /usr/src/app/package.json
RUN npm install

# Copiar el resto del src
COPY . /usr/src/app

# Construir la aplicación
RUN ng build --configuration production

# Etapa de producción
FROM nginx:stable-alpine

# Copiar archivos de construcción a nginx
COPY --from=build /usr/src/app/dist/personal-notes/browser /usr/share/nginx/html

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto
EXPOSE 80

# Comando por defecto para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
