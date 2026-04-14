using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Api.Tests;

[Collection("Api")]
public class ReceitasEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateClient();

    public async Task InitializeAsync() => await factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<Guid> CriarContaAsync(string nome = "Conta", decimal saldo = 0m)
    {
        var resp = await _client.PostAsJsonAsync("/contas", new { nome, saldoInicial = saldo });
        var body = await resp.Content.ReadFromJsonAsync<IdResponse>();
        return body!.Id;
    }

    // ── POST /receitas ───────────────────────────────────────────────────────

    [Fact]
    public async Task Post_DadosValidos_Retorna201ComId()
    {
        var contaId = await CriarContaAsync();

        var response = await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Projeto Alpha",
            contaId,
            valorTotal = 10_000m,
            parcelas = new[]
            {
                new { numero = 1, dataVencimento = "2026-06-01", percentagem = 50m },
                new { numero = 2, dataVencimento = "2026-07-01", percentagem = 50m }
            }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<IdResponse>();
        body!.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Post_NomeVazio_Retorna400()
    {
        var contaId = await CriarContaAsync();

        var response = await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "",
            contaId,
            valorTotal = 1_000m,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", percentagem = 100m } }
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Post_ContaInexistente_Retorna422()
    {
        var response = await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Proj",
            contaId = Guid.NewGuid(),
            valorTotal = 1_000m,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", percentagem = 100m } }
        });

        // EntityNotFoundException → DomainException handler → 422
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Post_PercentagemZero_Retorna400()
    {
        var contaId = await CriarContaAsync();

        var response = await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Proj",
            contaId,
            valorTotal = 1_000m,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", percentagem = 0m } }
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── GET /receitas ────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_RetornaReceitasComParcelas()
    {
        var contaId = await CriarContaAsync();
        await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Receita Listagem",
            contaId,
            valorTotal = 5_000m,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", percentagem = 100m } }
        });

        var response = await _client.GetAsync("/receitas");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lista = await response.Content.ReadFromJsonAsync<List<ReceitaResponse>>();
        lista.Should().NotBeEmpty();

        var receita = lista!.First(r => r.Nome == "Receita Listagem");
        receita.Parcelas.Should().HaveCount(1);
        receita.Parcelas[0].ValorBruto.Should().Be(5_000m);
    }

    // ── DELETE /receitas/{id} ────────────────────────────────────────────────

    [Fact]
    public async Task Delete_ReceitaExistente_Retorna204ENaoAparececNaLista()
    {
        var contaId = await CriarContaAsync();
        var postResp = await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Para Remover",
            contaId,
            valorTotal = 1_000m,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", percentagem = 100m } }
        });
        var receita = await postResp.Content.ReadFromJsonAsync<IdResponse>();

        var deleteResp = await _client.DeleteAsync($"/receitas/{receita!.Id}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var lista = await _client.GetFromJsonAsync<List<ReceitaResponse>>("/receitas");
        lista.Should().NotContain(r => r.Id == receita.Id);
    }

    [Fact]
    public async Task Delete_IdInexistente_Retorna422()
    {
        var response = await _client.DeleteAsync($"/receitas/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    private record IdResponse(Guid Id);
    private record ReceitaResponse(Guid Id, string Nome, List<ParcelaResponse> Parcelas);
    private record ParcelaResponse(Guid Id, int Numero, decimal ValorBruto, decimal ValorLiquido);
}
