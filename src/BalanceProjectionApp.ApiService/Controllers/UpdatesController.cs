using BalanceProjectionApp.ApiService.Services;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("updates")]
public class UpdatesController(GitHubUpdateService updateService) : ControllerBase
{
    [HttpGet("latest")]
    public async Task<IActionResult> Latest(CancellationToken ct)
    {
        var release = await updateService.GetLatestReleaseAsync(ct);
        if (release is null) return NotFound();

        var installer = release.Assets.FirstOrDefault(a => a.Name.EndsWith(".nsis.zip") && !a.Name.EndsWith(".sig"));
        var sig = release.Assets.FirstOrDefault(a => a.Name.EndsWith(".nsis.zip.sig"));

        if (installer is null || sig is null) return NotFound();

        using var sigStream = await updateService.DownloadAssetAsync(sig.Id, ct);
        using var reader = new StreamReader(sigStream);
        var signature = (await reader.ReadToEndAsync(ct)).Trim();

        var downloadUrl = $"{Request.Scheme}://{Request.Host}/updates/download/{installer.Id}";
        var version = release.TagName.TrimStart('v');

        return Ok(new
        {
            version,
            notes = release.Body ?? string.Empty,
            pub_date = release.PublishedAt.ToString("O"),
            platforms = new Dictionary<string, object>
            {
                ["windows-x86_64"] = new { url = downloadUrl, signature }
            }
        });
    }

    [HttpGet("download/{assetId:long}")]
    public async Task<IActionResult> Download(long assetId, CancellationToken ct)
    {
        var stream = await updateService.DownloadAssetAsync(assetId, ct);
        return File(stream, "application/octet-stream", "update.nsis.zip");
    }
}
