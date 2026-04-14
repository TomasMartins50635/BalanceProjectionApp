FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files first for layer-cached restore
COPY src/BalanceProjectionApp.Domain/BalanceProjectionApp.Domain.csproj src/BalanceProjectionApp.Domain/
COPY src/BalanceProjectionApp.Application/BalanceProjectionApp.Application.csproj src/BalanceProjectionApp.Application/
COPY src/BalanceProjectionApp.Infrastructure/BalanceProjectionApp.Infrastructure.csproj src/BalanceProjectionApp.Infrastructure/
COPY src/BalanceProjectionApp.ApiService/BalanceProjectionApp.ApiService.csproj src/BalanceProjectionApp.ApiService/

RUN dotnet restore src/BalanceProjectionApp.ApiService/BalanceProjectionApp.ApiService.csproj

COPY src/ src/

RUN dotnet publish src/BalanceProjectionApp.ApiService/BalanceProjectionApp.ApiService.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "BalanceProjectionApp.ApiService.dll"]
