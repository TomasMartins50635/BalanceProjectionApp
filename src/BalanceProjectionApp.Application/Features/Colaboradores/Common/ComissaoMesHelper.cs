namespace BalanceProjectionApp.Application.Features.Colaboradores.Common;

/// <summary>Calcula os pares (colaborador, mês) cuja despesa de comissão precisa de ser recalculada.</summary>
internal static class ComissaoMesHelper
{
    public static IReadOnlyCollection<(Guid ColaboradorId, DateOnly Mes)> CalcularPares(
        IEnumerable<Guid> colaboradorIds, IEnumerable<DateOnly> datasVencimento)
    {
        var meses = datasVencimento.Select(d => new DateOnly(d.Year, d.Month, 1)).Distinct().ToList();
        return colaboradorIds.Distinct()
            .SelectMany(colaboradorId => meses.Select(mes => (ColaboradorId: colaboradorId, Mes: mes)))
            .Distinct()
            .ToList();
    }
}
