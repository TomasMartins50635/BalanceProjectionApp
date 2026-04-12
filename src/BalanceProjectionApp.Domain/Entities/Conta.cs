using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Conta : Entity
{
    public string Nome { get; private set; } = string.Empty;
    public decimal Saldo { get; private set; }

    private Conta() { }

    public static Conta Criar(string nome, decimal saldoInicial = 0m)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da conta não pode ser vazio.");

        return new Conta { Nome = nome, Saldo = saldoInicial };
    }

    public void Creditar(decimal valor)
    {
        if (valor <= 0)
            throw new DomainException("O valor a creditar deve ser positivo.");

        Saldo += valor;
    }

    public void Debitar(decimal valor)
    {
        if (valor <= 0)
            throw new DomainException("O valor a debitar deve ser positivo.");

        Saldo -= valor;
    }
}
