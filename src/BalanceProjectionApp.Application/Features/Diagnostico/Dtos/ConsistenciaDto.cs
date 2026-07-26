namespace BalanceProjectionApp.Application.Features.Diagnostico.Dtos;

public record ConsistenciaDto(
    IReadOnlyList<InconsistenciaIvaDto> InconsistenciasIva,
    IReadOnlyList<InconsistenciaComissaoDto> InconsistenciasComissao,
    IReadOnlyList<InconsistenciaParcelaReceitaDto> InconsistenciasParcelaReceita
);

public record InconsistenciaIvaDto(
    Guid ReceitaId,
    string ReceitaNome,
    bool DespesaEmFalta,
    decimal ValorEsperado,
    decimal ValorAtual
);

public record InconsistenciaComissaoDto(
    Guid ColaboradorId,
    string ColaboradorNome,
    DateOnly Mes,
    bool DespesaEmFalta,
    decimal ValorEsperado,
    decimal ValorAtual
);

/// <summary>
/// Parcela de uma Receita com TemIva=true cujo ValorBruto não bate certo com
/// ValorLiquido × 1.23 — normalmente um resíduo de antes de a comissão deixar de ser
/// descontada no ValorLiquido. Não é corrigível automaticamente (reescrever o valor de uma
/// parcela já paga violaria a imutabilidade histórica), por isso não entra em
/// CorrigirInconsistenciasCommand — é apenas reportada para decisão manual.
/// </summary>
public record InconsistenciaParcelaReceitaDto(
    Guid ReceitaId,
    string ReceitaNome,
    Guid ParcelaId,
    int Numero,
    DateOnly DataVencimento,
    bool IsPaid,
    decimal ValorLiquido,
    decimal ValorBrutoAtual,
    decimal ValorBrutoEsperado
);
