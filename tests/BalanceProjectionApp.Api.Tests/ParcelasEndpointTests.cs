using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Api.Tests;

[Collection("Api")]
public class ParcelasEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateClient();

    public async Task InitializeAsync() => await factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>Creates conta + receita with one parcela and returns (contaId, parcelaId).</summary>
    private async Task<(Guid contaId, Guid parcelaId)> SeedReceitaComParcelaAsync(
        decimal valor = 10_000m)
    {
        var contaResp = await _client.PostAsJsonAsync("/contas", new { nome = "Conta", saldoInicial = 0m });
        var conta = await contaResp.Content.ReadFromJsonAsync<IdResponse>();

        await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Projeto",
            contaId = conta!.Id,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor } }
        });

        // Retrieve the parcela id via GET /parcelas/conta/{contaId}
        var parcelas = await _client.GetFromJsonAsync<List<ParcelaResponse>>($"/parcelas/conta/{conta.Id}");
        return (conta.Id, parcelas![0].Id);
    }

    // ── GET /parcelas/conta/{contaId} ────────────────────────────────────────

    [Fact]
    public async Task Get_ParcelasPorConta_RetornaListaOrdenadaPorVencimento()
    {
        var contaResp = await _client.PostAsJsonAsync("/contas", new { nome = "Conta Lista", saldoInicial = 0m });
        var conta = await contaResp.Content.ReadFromJsonAsync<IdResponse>();

        await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Proj",
            contaId = conta!.Id,
            parcelas = new[]
            {
                new { numero = 1, dataVencimento = "2026-03-01", valor = 5_000m },
                new { numero = 2, dataVencimento = "2026-01-01", valor = 5_000m }
            }
        });

        var response = await _client.GetAsync($"/parcelas/conta/{conta.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var parcelas = await response.Content.ReadFromJsonAsync<List<ParcelaResponse>>();
        parcelas.Should().HaveCount(2);
        // sorted by DataVencimento ascending
        parcelas![0].DataVencimento.Should().Be("2026-01-01");
        parcelas[1].DataVencimento.Should().Be("2026-03-01");
    }

    [Fact]
    public async Task Get_ApenasPendentes_ExcluiParcelasLiquidadas()
    {
        var (contaId, parcelaId) = await SeedReceitaComParcelaAsync();

        // Liquidate the parcela
        await _client.PostAsJsonAsync($"/parcelas/{parcelaId}/liquidar", new { });

        var response = await _client.GetAsync($"/parcelas/conta/{contaId}?apenasPendentes=true");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var parcelas = await response.Content.ReadFromJsonAsync<List<ParcelaResponse>>();
        parcelas.Should().BeEmpty();
    }

    // ── POST /parcelas/{id}/liquidar ─────────────────────────────────────────

    [Fact]
    public async Task Post_Liquidar_SemData_Retorna200ComNovoSaldo()
    {
        var (_, parcelaId) = await SeedReceitaComParcelaAsync(10_000m);

        var response = await _client.PostAsJsonAsync($"/parcelas/{parcelaId}/liquidar", new { });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<LiquidarResponse>();
        body!.ValorLiquido.Should().Be(10_000m);
        body.NovoSaldoConta.Should().Be(10_000m);
    }

    [Fact]
    public async Task Post_Liquidar_ComData_UsaDataFornecida()
    {
        var (_, parcelaId) = await SeedReceitaComParcelaAsync();

        var response = await _client.PostAsJsonAsync($"/parcelas/{parcelaId}/liquidar",
            new { dataPagamento = "2026-05-15" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<LiquidarResponse>();
        body.Should().NotBeNull();
    }

    [Fact]
    public async Task Post_Liquidar_ParcelaJaLiquidada_Retorna422()
    {
        var (_, parcelaId) = await SeedReceitaComParcelaAsync();

        await _client.PostAsJsonAsync($"/parcelas/{parcelaId}/liquidar", new { });
        var response = await _client.PostAsJsonAsync($"/parcelas/{parcelaId}/liquidar", new { });

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Post_Liquidar_IdInexistente_Retorna422()
    {
        var response = await _client.PostAsJsonAsync($"/parcelas/{Guid.NewGuid()}/liquidar", new { });

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Post_Liquidar_AtualizaSaldoDaConta()
    {
        var contaResp = await _client.PostAsJsonAsync("/contas", new { nome = "Conta Saldo", saldoInicial = 500m });
        var conta = await contaResp.Content.ReadFromJsonAsync<IdResponse>();

        await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Proj",
            contaId = conta!.Id,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 2_000m } }
        });

        var parcelas = await _client.GetFromJsonAsync<List<ParcelaResponse>>($"/parcelas/conta/{conta.Id}");
        await _client.PostAsJsonAsync($"/parcelas/{parcelas![0].Id}/liquidar", new { });

        var contaAtualizada = await _client.GetFromJsonAsync<ContaResponse>($"/contas/{conta.Id}");
        contaAtualizada!.Saldo.Should().Be(2_500m); // 500 + 2000
    }

    private record IdResponse(Guid Id);
    private record ParcelaResponse(Guid Id, int Numero, string DataVencimento, bool IsPaid);
    private record LiquidarResponse(Guid ParcelaId, decimal ValorLiquido, decimal NovoSaldoConta);
    private record ContaResponse(Guid Id, string Nome, decimal Saldo);
}
