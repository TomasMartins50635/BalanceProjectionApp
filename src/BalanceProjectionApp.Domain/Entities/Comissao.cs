using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Comissao : Entity
{
    /// <summary>Percentagem da comissão, ex: 5 representa 5%.</summary>
    public decimal Percentagem { get; private set; }

    public Guid ReceitaId { get; private set; }
    public Receita Receita { get; private set; } = null!;

    private Comissao() { }

    internal static Comissao Criar(decimal percentagem, Guid receitaId)
    {
        if (percentagem < 0 || percentagem > 100)
            throw new DomainException("A percentagem da comissão deve estar entre 0 e 100.");

        return new Comissao { Percentagem = percentagem, ReceitaId = receitaId };
    }

    public decimal Calcular(decimal valorBruto) => valorBruto * (Percentagem / 100m);
}
