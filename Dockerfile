# ---- build ----
    FROM node:18-bullseye-slim AS build
    WORKDIR /workspace
    COPY package.json package-lock.json* ./
    RUN npm ci
    COPY . .
    ARG NEXT_PUBLIC_API_URL
    ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    RUN npm run build
    
    # ---- runtime ----
    FROM nginx:1.25-alpine
    COPY --from=build /workspace/dist /usr/share/nginx/html
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    