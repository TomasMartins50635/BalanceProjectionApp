using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Parcela : Entity
{
    public int Numero { get; private set; }
    public DateOnly DataVencimento { get; private set; }
    public decimal ValorBruto { get; private set; }

    /// <summary>ValorBruto menos a comissão (apenas aplicável a parcelas de Receita).</summary>
    public decimal ValorLiquido { get; private set; }

    /// <summary>Percentagem do ValorTotal da Receita usada para calcular ValorBruto. Nulo em Despesas.</summary>
    public decimal? Percentagem { get; private set; }

    public bool IsPaid { get; private set; }
    public DateTime? DataPagamento { get; private set; }

    // Conta denormalizada para evitar joins na liquidação
    public Guid ContaId { get; private set; }

    // Uma parcela pertence a uma Receita OU a uma Despesa (nunca ambas)
    public Guid? ReceitaId { get; private set; }
    public Guid? DespesaId { get; private set; }

    public Receita? Receita { get; private set; }
    public Despesa? Despesa { get; private set; }

    private Parcela() { }

    internal static Parcela Criar(int numero, DateOnly dataVencimento, decimal valorBruto,
        decimal valorLiquido, Guid contaId, Guid? receitaId, Guid? despesaId, decimal? percentagem = null)
    {
        if (valorBruto <= 0)
            throw new DomainException("O valor bruto da parcela não pode ser negativo.");

        if (valorLiquido < 0)
            throw new DomainException("O valor líquido da parcela não pode ser negativo.");

        if (receitaId is null && despesaId is null)
            throw new DomainException("A parcela deve pertencer a uma Receita ou a uma Despesa.");

        return new Parcela
        {
            Numero = numero,
            DataVencimento = dataVencimento,
            ValorBruto = valorBruto,
            ValorLiquido = valorLiquido,
            ContaId = contaId,
            ReceitaId = receitaId,
            DespesaId = despesaId,
            Percentagem = percentagem
        };
    }

    public void Liquidar(DateOnly? dataPagamento = null)
    {
        if (IsPaid)
            throw new DomainException($"A parcela {Numero} já foi liquidada.");

        IsPaid = true;
        var data = dataPagamento ?? DateOnly.FromDateTime(DateTime.UtcNow);
        DataPagamento = data.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
    }

    public void Estornar()
    {
        if (!IsPaid)
            throw new DomainException($"A parcela {Numero} não está liquidada.");

        IsPaid = false;
        DataPagamento = null;
    }

    public void AlterarConta(Guid novaContaId)
    {
        if (IsPaid)
            throw new DomainException("Não é possível alterar a conta de uma parcela já liquidada.");

        ContaId = novaContaId;
    }

    public void AtualizarValor(decimal valorBruto)
    {
        if (IsPaid)
            throw new DomainException("Não é possível alterar o valor de uma parcela já liquidada.");

        ValorBruto = valorBruto;
        ValorLiquido = valorBruto;
    }

    public bool EReceita() => ReceitaId.HasValue;
}
