using System.Globalization;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Common;

/// <summary>
/// Cria e mantém sincronizada a Despesa mensal que paga a comissão de um colaborador,
/// agregando as contribuições de todas as receitas ativas desse colaborador nesse mês.
/// </summary>
internal static class DespesaComissaoFactory
{
    public static Despesa Criar(Colaborador colaborador, DateOnly mesReferencia, Guid contaId, decimal valorTotal)
    {
        var despesa = Despesa.Criar(
            NomeDespesa(colaborador, mesReferencia),
            contaId,
            CategoriaContrato.Comissao,
            TipoDespesa.Pontual,
            colaboradorId: colaborador.Id,
            mesReferencia: mesReferencia);

        despesa.AdicionarParcela(1, UltimoDiaDoMes(mesReferencia), valorTotal);
        return despesa;
    }

    /// <summary>
    /// Remove a parcela ainda não liquidada e recria-a com o novo total. Devolve null se o novo
    /// total for zero (nada a recriar) — a numeração continua a partir do máximo ativo, para não
    /// colidir com uma parcela já paga.
    /// </summary>
    public static Parcela? Sincronizar(Despesa despesa, DateOnly mesReferencia, decimal novoValorTotal)
    {
        despesa.RemoverParcelasNaoLiquidadas();
        if (novoValorTotal <= 0)
            return null;

        var proximoNumero = despesa.Parcelas.Where(p => !p.IsDeleted)
            .Select(p => p.Numero).DefaultIfEmpty(0).Max() + 1;
        return despesa.AdicionarParcela(proximoNumero, UltimoDiaDoMes(mesReferencia), novoValorTotal);
    }

    /// <summary>Soft-deleta a despesa apenas se nunca teve nenhuma parcela ativa (paga ou não).</summary>
    public static void RemoverSeVazia(Despesa despesa)
    {
        if (despesa.Parcelas.All(p => p.IsDeleted))
            despesa.Deletar();
    }

    private static DateOnly UltimoDiaDoMes(DateOnly mes)
        => new(mes.Year, mes.Month, DateTime.DaysInMonth(mes.Year, mes.Month));

    private static string NomeDespesa(Colaborador colaborador, DateOnly mesReferencia)
    {
        var cultura = CultureInfo.GetCultureInfo("pt-PT");
        var mes = mesReferencia.ToString("MMMM yyyy", cultura);
        mes = char.ToUpper(mes[0], cultura) + mes[1..];
        return $"Comissão de {colaborador.Nome} — {mes}";
    }
}
