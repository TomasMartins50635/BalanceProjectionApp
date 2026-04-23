using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Colaborador : Entity
{
    public string Nome { get; private set; } = string.Empty;

    /// <summary>Percentagem da comissão, ex: 5 representa 5%.</summary>
    public decimal Percentagem { get; private set; }

    private Colaborador() { }

    public static Colaborador Criar(string nome, decimal percentagem)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome do colaborador não pode ser vazio.");

        if (percentagem < 0 || percentagem > 100)
            throw new DomainException("A percentagem da comissão deve estar entre 0 e 100.");

        return new Colaborador { Nome = nome, Percentagem = percentagem };
    }

    public void Desativar()
    {
        if (IsDeleted)
            throw new DomainException("O colaborador já se encontra removido.");

        IsDeleted = true;
    }
}
