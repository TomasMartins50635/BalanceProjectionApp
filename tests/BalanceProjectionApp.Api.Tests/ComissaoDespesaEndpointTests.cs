using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Api.Tests;

[Collection("Api")]
public class ComissaoDespesaEndpointTests(ApiFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateClient();

    public async Task InitializeAsync() => await factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<Guid> CriarContaAsync(string nome = "Conta")
    {
        var resp = await _client.PostAsJsonAsync("/contas", new { nome, saldoInicial = 0m });
        var body = await resp.Content.ReadFromJsonAsync<IdResponse>();
        return body!.Id;
    }

    private async Task<Guid> CriarColaboradorServicoAsync(string nome = "Ana", decimal percentagemServico = 10m)
    {
        var resp = await _client.PostAsJsonAsync("/colaboradores", new
        {
            nome,
            tipo = "Servico",
            percentagemServico
        });
        var body = await resp.Content.ReadFromJsonAsync<IdResponse>();
        return body!.Id;
    }

    private async Task<Guid> CriarReceitaComComissaoAsync(Guid contaId, Guid colaboradorId, decimal percentagem,
        string dataVencimento, decimal valor, string nome = "Receita")
    {
        var resp = await _client.PostAsJsonAsync("/receitas", new
        {
            nome,
            contaId,
            parcelas = new[] { new { numero = 1, dataVencimento, valor } },
            comissoes = new[] { new { colaboradorId, tipoComissao = "Servico", percentagem } }
        });
        var body = await resp.Content.ReadFromJsonAsync<IdResponse>();
        return body!.Id;
    }

    private async Task<List<DespesaResponse>> ListarDespesasAsync()
        => await _client.GetFromJsonAsync<List<DespesaResponse>>("/despesas") ?? [];

    // ── Criação e agregação ──────────────────────────────────────────────────

    [Fact]
    public async Task CriarReceitaComComissao_GeraDespesaDeComissaoCorreta()
    {
        var contaId = await CriarContaAsync();
        var colaboradorId = await CriarColaboradorServicoAsync();

        await CriarReceitaComComissaoAsync(contaId, colaboradorId, 10m, "2026-06-15", 1_000m);

        var despesas = await ListarDespesasAsync();
        var comissao = despesas.Should().ContainSingle(d => d.Categoria == "Comissao").Subject;

        comissao.ContaId.Should().Be(contaId);
        comissao.Parcelas.Single().ValorBruto.Should().Be(100m);
        comissao.Parcelas.Single().DataVencimento.Should().Be("2026-06-30");
    }

    [Fact]
    public async Task DuasReceitasMesmoColaboradorMesmoMes_SomamNaMesmaDespesa()
    {
        var contaId = await CriarContaAsync();
        var colaboradorId = await CriarColaboradorServicoAsync();

        await CriarReceitaComComissaoAsync(contaId, colaboradorId, 10m, "2026-06-05", 1_000m, "Receita 1");
        await CriarReceitaComComissaoAsync(contaId, colaboradorId, 10m, "2026-06-20", 2_000m, "Receita 2");

        var despesas = await ListarDespesasAsync();
        var comissoes = despesas.Where(d => d.Categoria == "Comissao").ToList();

        comissoes.Should().ContainSingle();
        comissoes[0].Parcelas.Single().ValorBruto.Should().Be(300m); // 100 + 200
    }

    [Fact]
    public async Task ComissaoComParcelasEmMesesDiferentes_GeraUmaDespesaPorMes()
    {
        var contaId = await CriarContaAsync();
        var colaboradorId = await CriarColaboradorServicoAsync();

        var resp = await _client.PostAsJsonAsync("/receitas", new
        {
            nome = "Receita Multi-Mês",
            contaId,
            parcelas = new[]
            {
                new { numero = 1, dataVencimento = "2026-06-10", valor = 1_000m },
                new { numero = 2, dataVencimento = "2026-07-10", valor = 2_000m }
            },
            comissoes = new[] { new { colaboradorId, tipoComissao = "Servico", percentagem = 10m } }
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);

        var despesas = await ListarDespesasAsync();
        var comissoes = despesas.Where(d => d.Categoria == "Comissao").ToList();

        comissoes.Should().HaveCount(2);
        comissoes.Should().ContainSingle(d => d.Parcelas.Single().ValorBruto == 100m);
        comissoes.Should().ContainSingle(d => d.Parcelas.Single().ValorBruto == 200m);
    }

    // ── Edição ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task MoverParcelaParaOutroMes_DeslocaContribuicaoParaNovaDespesa()
    {
        var contaId = await CriarContaAsync();
        var colaboradorId = await CriarColaboradorServicoAsync();
        var receitaId = await CriarReceitaComComissaoAsync(contaId, colaboradorId, 10m, "2026-06-15", 1_000m);

        var putResp = await _client.PutAsJsonAsync($"/receitas/{receitaId}", new
        {
            nome = "Receita",
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-07-15", valor = 1_000m } }
        });
        putResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var despesas = await ListarDespesasAsync();
        var comissoes = despesas.Where(d => d.Categoria == "Comissao").ToList();

        comissoes.Should().ContainSingle();
        comissoes[0].Parcelas.Single().DataVencimento.Should().Be("2026-07-31");
    }

    [Fact]
    public async Task EditarSegundaReceitaContribuinte_NaoDevolve500()
    {
        // Regressão do bug de EF Core (Added vs Modified) apanhado no IVA — aqui a despesa já
        // existe (criada pela 1ª receita) quando a 2ª é editada, forçando o ramo de resync.
        var contaId = await CriarContaAsync();
        var colaboradorId = await CriarColaboradorServicoAsync();
        await CriarReceitaComComissaoAsync(contaId, colaboradorId, 10m, "2026-06-05", 1_000m, "Receita 1");
        var receita2Id = await CriarReceitaComComissaoAsync(contaId, colaboradorId, 10m, "2026-06-20", 2_000m, "Receita 2");

        var putResp = await _client.PutAsJsonAsync($"/receitas/{receita2Id}", new
        {
            nome = "Receita 2",
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-20", valor = 3_000m } }
        });

        putResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var despesas = await ListarDespesasAsync();
        var comissoes = despesas.Where(d => d.Categoria == "Comissao").ToList();
        comissoes.Should().ContainSingle();
        comissoes[0].Parcelas.Single().ValorBruto.Should().Be(400m); // 100 + 300
    }

    // ── Remoção ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task RemoverComissaoUnicaContribuinte_RemoveDespesa()
    {
        var contaId = await CriarContaAsync();
        var colaboradorId = await CriarColaboradorServicoAsync();
        var receitaId = await CriarReceitaComComissaoAsync(contaId, colaboradorId, 10m, "2026-06-15", 1_000m);

        var lista = await _client.GetFromJsonAsync<List<ReceitaResponse>>("/receitas");
        var comissaoId = lista!.First(r => r.Id == receitaId).Comissoes.Single().Id;

        var deleteResp = await _client.DeleteAsync($"/receitas/{receitaId}/comissoes/{comissaoId}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var despesas = await ListarDespesasAsync();
        despesas.Should().NotContain(d => d.Categoria == "Comissao");
    }

    // ── Guardas ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Post_DespesaCategoriaComissao_Retorna400()
    {
        var contaId = await CriarContaAsync();

        var resp = await _client.PostAsJsonAsync("/despesas", new
        {
            nome = "Comissão manual",
            contaId,
            categoria = "Comissao",
            tipoDespesa = "Pontual",
            parcelas = new[] { new { numero = 1, dataVencimento = "2026-06-30", valorBruto = 100m } }
        });

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Put_DespesaDeComissao_Retorna422()
    {
        var contaId = await CriarContaAsync();
        var colaboradorId = await CriarColaboradorServicoAsync();
        await CriarReceitaComComissaoAsync(contaId, colaboradorId, 10m, "2026-06-15", 1_000m);

        var despesas = await ListarDespesasAsync();
        var comissaoDespesaId = despesas.First(d => d.Categoria == "Comissao").Id;

        var putResp = await _client.PutAsJsonAsync($"/despesas/{comissaoDespesaId}", new
        {
            nome = "Alterado",
            categoria = "Comissao"
        });

        putResp.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    private record IdResponse(Guid Id);
    private record ParcelaResponse(Guid Id, int Numero, decimal ValorBruto, string DataVencimento);
    private record DespesaResponse(Guid Id, string Nome, string? Categoria, Guid ContaId, List<ParcelaResponse> Parcelas);
    private record ReceitaComissaoResponse(Guid Id);
    private record ReceitaResponse(Guid Id, List<ReceitaComissaoResponse> Comissoes);
}
