FROM node:24-bookworm-slim AS frontend
WORKDIR /src/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY server/Accessorati.Api.csproj server/
RUN dotnet restore server/Accessorati.Api.csproj
COPY server/ server/
COPY --from=frontend /src/server/wwwroot/ server/wwwroot/
RUN dotnet publish server/Accessorati.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend /app/publish/ ./
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Accessorati.Api.dll"]
