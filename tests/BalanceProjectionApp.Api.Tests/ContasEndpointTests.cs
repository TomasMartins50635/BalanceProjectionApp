using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Api.Tests;

[Collection("Api")]
public class ContasEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateClient();

    public async Task InitializeAsync() => await factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    // ── POST /contas ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Post_DadosValidos_Retorna201ComId()
    {
        var response = await _client.PostAsJsonAsync("/contas", new { nome = "Conta Corrente", saldoInicial = 1000m });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<IdResponse>();
        body!.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Post_NomeVazio_Retorna400()
    {
        var response = await _client.PostAsJsonAsync("/contas", new { nome = "", saldoInicial = 0m });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Post_SaldoNegativo_Retorna400()
    {
        var response = await _client.PostAsJsonAsync("/contas", new { nome = "Conta", saldoInicial = -1m });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── GET /contas ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_RetornaListaDeContas()
    {
        await _client.PostAsJsonAsync("/contas", new { nome = "Conta A", saldoInicial = 0m });
        await _client.PostAsJsonAsync("/contas", new { nome = "Conta B", saldoInicial = 0m });

        var response = await _client.GetAsync("/contas");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var lista = await response.Content.ReadFromJsonAsync<List<ContaResponse>>();
        lista.Should().HaveCountGreaterThanOrEqualTo(2);
        lista!.Select(c => c.Nome).Should().Contain(["Conta A", "Conta B"]);
    }

    // ── GET /contas/{id} ─────────────────────────────────────────────────────

    [Fact]
    public async Task Get_ById_ContaExistente_Retorna200ComSaldo()
    {
        var postResponse = await _client.PostAsJsonAsync("/contas", new { nome = "Poupança", saldoInicial = 500m });
        var criada = await postResponse.Content.ReadFromJsonAsync<IdResponse>();

        var response = await _client.GetAsync($"/contas/{criada!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var conta = await response.Content.ReadFromJsonAsync<ContaResponse>();
        conta!.Nome.Should().Be("Poupança");
        conta.Saldo.Should().Be(500m);
    }

    [Fact]
    public async Task Get_ById_IdInexistente_Retorna404()
    {
        var response = await _client.GetAsync($"/contas/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── DELETE /contas/{id} ──────────────────────────────────────────────────

    [Fact]
    public async Task Delete_ContaSemEntidades_Retorna204()
    {
        var postResponse = await _client.PostAsJsonAsync("/contas", new { nome = "Para Apagar", saldoInicial = 0m });
        var criada = await postResponse.Content.ReadFromJsonAsync<IdResponse>();

        var response = await _client.DeleteAsync($"/contas/{criada!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Delete_ContaComReceitas_Retorna422()
    {
        // Create conta
        var contaPost = await _client.PostAsJsonAsync("/contas", new { nome = "Conta Vinculada", saldoInicial = 0m });
        var conta = await contaPost.Content.ReadFromJsonAsync<IdResponse>();

        // Create receita linked to it
        await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Proj",
            contaId = conta!.Id,
            valorTotal = 1000m,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", percentagem = 100m } }
        });

        var response = await _client.DeleteAsync($"/contas/{conta.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Delete_IdInexistente_Retorna422()
    {
        var response = await _client.DeleteAsync($"/contas/{Guid.NewGuid()}");

        // EntityNotFoundException extends DomainException → mapped to 422
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    private record IdResponse(Guid Id);
    private record ContaResponse(Guid Id, string Nome, decimal Saldo);
}
