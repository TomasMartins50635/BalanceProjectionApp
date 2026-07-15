namespace BalanceProjectionApp.Application.Features.Colaboradores.Common;

/// <summary>
/// Recalcula, para um colaborador e mês, a Despesa que agrega as suas comissões de todas as
/// receitas ativas com parcelas vencidas nesse mês.
/// </summary>
public interface IComissaoDespesaSincronizador
{
    Task RecalcularAsync(Guid colaboradorId, DateOnly mesReferencia, CancellationToken cancellationToken = default);
}
