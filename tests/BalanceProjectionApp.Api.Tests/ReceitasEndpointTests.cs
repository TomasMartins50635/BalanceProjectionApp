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
            parcelas = new[]
            {
                new { numero = 1, dataVencimento = "2026-06-01", valor = 5_000m },
                new { numero = 2, dataVencimento = "2026-07-01", valor = 5_000m }
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
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 1_000m } }
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
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 1_000m } }
        });

        // EntityNotFoundException → DomainException handler → 422
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Post_ValorZero_Retorna400()
    {
        var contaId = await CriarContaAsync();

        var response = await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Proj",
            contaId,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 0m } }
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
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 5_000m } }
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
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 1_000m } }
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

    // ── TemIva ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Post_TemIvaTrue_InflaValorBrutoECriaDespesaIva()
    {
        var contaId = await CriarContaAsync();

        var response = await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Receita Com IVA",
            contaId,
            temIva = true,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 1_000m } }
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var lista = await _client.GetFromJsonAsync<List<ReceitaResponse>>("/receitas");
        var receita = lista!.First(r => r.Nome == "Receita Com IVA");
        receita.TemIva.Should().BeTrue();
        receita.Parcelas.Single().ValorBruto.Should().Be(1_230m);

        var despesas = await _client.GetFromJsonAsync<List<DespesaResponse>>("/despesas");
        despesas.Should().ContainSingle(d => d.Nome == "IVA de Receita Com IVA" && d.Categoria == "IVA");
    }

    [Fact]
    public async Task Put_AlternaTemIvaFalseParaTrue_CriaDespesaIva()
    {
        var contaId = await CriarContaAsync();
        var postResp = await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Receita Sem IVA",
            contaId,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 1_000m } }
        });
        var receita = await postResp.Content.ReadFromJsonAsync<IdResponse>();

        var putResp = await _client.PutAsJsonAsync($"/receitas/{receita!.Id}", new
        {
            nome = "Receita Sem IVA",
            temIva = true,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 1_000m } }
        });
        putResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var lista = await _client.GetFromJsonAsync<List<ReceitaResponse>>("/receitas");
        var atualizada = lista!.First(r => r.Id == receita.Id);
        atualizada.TemIva.Should().BeTrue();
        atualizada.Parcelas.Single().ValorBruto.Should().Be(1_230m);

        var despesas = await _client.GetFromJsonAsync<List<DespesaResponse>>("/despesas");
        despesas.Should().ContainSingle(d => d.Nome == "IVA de Receita Sem IVA" && d.Categoria == "IVA");
    }

    [Fact]
    public async Task Put_AlternaTemIvaTrueParaFalse_RemoveDespesaIva()
    {
        var contaId = await CriarContaAsync();
        var postResp = await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Receita Deixa IVA",
            contaId,
            temIva = true,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 1_000m } }
        });
        var receita = await postResp.Content.ReadFromJsonAsync<IdResponse>();

        var putResp = await _client.PutAsJsonAsync($"/receitas/{receita!.Id}", new
        {
            nome = "Receita Deixa IVA",
            temIva = false,
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-01", valor = 1_000m } }
        });
        putResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var lista = await _client.GetFromJsonAsync<List<ReceitaResponse>>("/receitas");
        var atualizada = lista!.First(r => r.Id == receita.Id);
        atualizada.TemIva.Should().BeFalse();
        atualizada.Parcelas.Single().ValorBruto.Should().Be(1_000m);

        var despesas = await _client.GetFromJsonAsync<List<DespesaResponse>>("/despesas");
        despesas.Should().NotContain(d => d.Nome == "IVA de Receita Deixa IVA");
    }

    private record IdResponse(Guid Id);
    private record ReceitaResponse(Guid Id, string Nome, List<ParcelaResponse> Parcelas, bool TemIva);
    private record ParcelaResponse(Guid Id, int Numero, decimal ValorBruto, decimal ValorLiquido);
    private record DespesaResponse(Guid Id, string Nome, string? Categoria);
}
