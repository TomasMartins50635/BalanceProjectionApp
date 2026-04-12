var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.BalanceProjectionApp_API_ApiService>("apiservice")
    .WithHttpHealthCheck("/health");

builder.AddProject<Projects.BalanceProjectionApp_API_Web>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithReference(apiService)
    .WaitFor(apiService);

builder.Build().Run();
