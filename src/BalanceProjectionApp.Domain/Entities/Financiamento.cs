using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Financiamento : Entity
{
    public string Nome { get; private set; } = string.Empty;
    public decimal Valor { get; private set; }
    public DateOnly Data { get; private set; }
    public Guid ContaId { get; private set; }
    public Conta Conta { get; private set; } = null!;

    /// <summary>Despesa associada para rastreabilidade dos custos financiados (opcional).</summary>
    public Guid? DespesaId { get; private set; }
    public Despesa? Despesa { get; private set; }

    private Financiamento() { }

    public static Financiamento Criar(string nome, decimal valor, DateOnly data, Guid contaId, Guid? despesaId = null)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome do financiamento não pode ser vazio.");

        if (valor <= 0)
            throw new DomainException("O valor do financiamento deve ser positivo.");

        return new Financiamento
        {
            Nome = nome,
            Valor = valor,
            Data = data,
            ContaId = contaId,
            DespesaId = despesaId
        };
    }
}
