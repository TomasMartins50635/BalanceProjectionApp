using System.Net.Http.Headers;
using System.Text.Json.Serialization;

namespace BalanceProjectionApp.ApiService.Services;

public class GitHubUpdateService(IHttpClientFactory factory, IConfiguration config)
{
    private readonly HttpClient _client = factory.CreateClient("github");
    private readonly string _owner = config["GitHub:Owner"] ?? throw new InvalidOperationException("GitHub:Owner not configured");
    private readonly string _repo = config["GitHub:Repo"] ?? throw new InvalidOperationException("GitHub:Repo not configured");

    public async Task<GitHubRelease?> GetLatestReleaseAsync(CancellationToken ct = default) =>
        await _client.GetFromJsonAsync<GitHubRelease>(
            $"https://api.github.com/repos/{_owner}/{_repo}/releases/latest", ct);

    public async Task<Stream> DownloadAssetAsync(long assetId, CancellationToken ct = default)
    {
        var request = new HttpRequestMessage(HttpMethod.Get,
            $"https://api.github.com/repos/{_owner}/{_repo}/releases/assets/{assetId}");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/octet-stream"));

        var response = await _client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStreamAsync(ct);
    }
}

public record GitHubRelease(
    [property: JsonPropertyName("tag_name")] string TagName,
    [property: JsonPropertyName("body")] string? Body,
    [property: JsonPropertyName("published_at")] DateTimeOffset PublishedAt,
    [property: JsonPropertyName("assets")] List<GitHubAsset> Assets
);

public record GitHubAsset(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("name")] string Name
);
