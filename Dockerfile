# ---- build ----
    FROM node:18-bullseye-slim AS build
    WORKDIR /workspace
    COPY package.json package-lock.json* ./
    RUN npm ci
    COPY . .
    ARG VITE_API_URL
    ENV ENV VITE_API_URL=${VITE_API_URL}
    RUN npm run build
    
    # ---- runtime ----
    FROM nginx:1.25-alpine
    COPY --from=build /workspace/dist /usr/share/nginx/html
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    