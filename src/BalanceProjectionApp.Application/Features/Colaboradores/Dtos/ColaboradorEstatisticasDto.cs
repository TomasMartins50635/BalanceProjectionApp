using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Dtos;

public record ColaboradorEstatisticasDto(
    Guid Id,
    string Nome,
    TipoColaborador Tipo,
    DateOnly DataInicio,
    DateOnly DataFim,
    decimal TotalRecebidoPeriodo,
    decimal TotalPendente,
    decimal TotalRecebidoGlobal,
    int ReceitasCount,
    int ParcelasPagasPeriodo,
    int ParcelasPendentes,
    IEnumerable<EstatisticasTipoComissaoDto> PorTipo,
    IEnumerable<ReceitaParticipacaoDto> Receitas
);

public record EstatisticasTipoComissaoDto(
    string TipoComissao,
    decimal RecebidoPeriodo,
    decimal Pendente,
    int ParcelasPagasPeriodo,
    int ParcelasPendentes
);

public record ReceitaParticipacaoDto(
    Guid ReceitaId,
    string ReceitaNome,
    string? Categoria,
    string TipoComissao,
    decimal Percentagem,
    decimal RecebidoPeriodo,
    decimal Pendente,
    IEnumerable<ParcelaParticipacaoDto> Parcelas
);

public record ParcelaParticipacaoDto(
    Guid Id,
    int Numero,
    DateOnly DataVencimento,
    DateOnly? DataPagamento,
    decimal ValorBruto,
    decimal ValorComissao,
    bool IsPaid
);
