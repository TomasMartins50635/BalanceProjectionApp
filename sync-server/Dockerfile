FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY BalanceProjectionApp.SyncServer.csproj .
RUN dotnet restore BalanceProjectionApp.SyncServer.csproj

COPY . .

RUN dotnet publish BalanceProjectionApp.SyncServer.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8081
EXPOSE 8081

ENTRYPOINT ["dotnet", "BalanceProjectionApp.SyncServer.dll"]
