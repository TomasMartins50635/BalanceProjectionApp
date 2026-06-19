using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Previsao : Entity
{
    public string Nome { get; private set; } = string.Empty;
    public Guid? ContaId { get; private set; }
    public Conta? Conta { get; private set; }

    public int? DiasEntreVendas { get; private set; }
    public decimal? ValorMedioVenda { get; private set; }
    public int? DiasEntreArrendamentos { get; private set; }
    public decimal? ValorMedioArrendamento { get; private set; }

    private Previsao() { }

    public static Previsao Criar(
        string nome,
        Guid? contaId,
        int? diasEntreVendas,
        decimal? valorMedioVenda,
        int? diasEntreArrendamentos,
        decimal? valorMedioArrendamento)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da previsão não pode ser vazio.");

        return new Previsao
        {
            Nome = nome,
            ContaId = contaId,
            DiasEntreVendas = diasEntreVendas,
            ValorMedioVenda = valorMedioVenda,
            DiasEntreArrendamentos = diasEntreArrendamentos,
            ValorMedioArrendamento = valorMedioArrendamento
        };
    }

    public void Atualizar(
        string nome,
        int? diasEntreVendas,
        decimal? valorMedioVenda,
        int? diasEntreArrendamentos,
        decimal? valorMedioArrendamento)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da previsão não pode ser vazio.");

        Nome = nome;
        DiasEntreVendas = diasEntreVendas;
        ValorMedioVenda = valorMedioVenda;
        DiasEntreArrendamentos = diasEntreArrendamentos;
        ValorMedioArrendamento = valorMedioArrendamento;
    }
}
