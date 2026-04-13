var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.BalanceProjectionApp_ApiService>("apiservice")
    .WithHttpHealthCheck("/health");

builder.Build().Run();
