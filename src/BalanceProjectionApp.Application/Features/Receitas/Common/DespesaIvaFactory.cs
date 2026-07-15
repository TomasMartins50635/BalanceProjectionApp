using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Application.Features.Receitas.Common;

/// <summary>
/// Cria e mantém sincronizada a Despesa de IVA (23% por parcela, vencimento dia 25) associada
/// a uma Receita com TemIva = true. Regra fiscal específica de Receita, por isso vive aqui
/// e não em Despesa.
/// </summary>
internal static class DespesaIvaFactory
{
    private const decimal TaxaIva = 0.23m;
    private const int DiaVencimento = 25;

    public static Despesa Criar(string nomeReceita, Guid contaId,
        IReadOnlyList<(int Numero, DateOnly DataVencimento, decimal ValorPreIva)> parcelas)
    {
        var despesa = Despesa.Criar($"IVA de {nomeReceita}", contaId, CategoriaContrato.IVA, TipoDespesa.Pontual);
        AdicionarParcelas(despesa, parcelas, numeroInicial: 1);
        return despesa;
    }

    /// <summary>
    /// Remove as parcelas ainda não liquidadas e recria-as a partir das parcelas atuais da receita.
    /// A numeração continua a partir do máximo número ativo (parcelas já pagas não são renumeradas).
    /// Devolve as novas parcelas — a despesaIva já estava rastreada pelo EF (não foi Add()-ada de
    /// novo), por isso o chamador tem de as registar explicitamente via IParcelaRepository.
    /// </summary>
    public static IReadOnlyList<Parcela> Sincronizar(Despesa despesaIva,
        IReadOnlyList<(int Numero, DateOnly DataVencimento, decimal ValorPreIva)> parcelas)
    {
        despesaIva.RemoverParcelasNaoLiquidadas();
        var proximoNumero = despesaIva.Parcelas.Where(p => !p.IsDeleted)
            .Select(p => p.Numero).DefaultIfEmpty(0).Max() + 1;
        return AdicionarParcelas(despesaIva, parcelas, proximoNumero);
    }

    public static void Remover(Despesa despesaIva)
    {
        foreach (var parcela in despesaIva.Parcelas.Where(p => !p.IsDeleted))
            parcela.Deletar();

        despesaIva.Deletar();
    }

    private static IReadOnlyList<Parcela> AdicionarParcelas(Despesa despesa,
        IReadOnlyList<(int Numero, DateOnly DataVencimento, decimal ValorPreIva)> parcelas, int numeroInicial)
    {
        var numero = numeroInicial;
        var novas = new List<Parcela>();
        foreach (var p in parcelas.OrderBy(x => x.Numero))
        {
            var valorIva = Math.Round(p.ValorPreIva * TaxaIva, 2);
            var vencimentoIva = p.DataVencimento.Day < DiaVencimento
                ? new DateOnly(p.DataVencimento.Year, p.DataVencimento.Month, DiaVencimento)
                : new DateOnly(p.DataVencimento.Year, p.DataVencimento.Month, DiaVencimento).AddMonths(1);
            novas.Add(despesa.AdicionarParcela(numero++, vencimentoIva, valorIva));
        }
        return novas;
    }
}
