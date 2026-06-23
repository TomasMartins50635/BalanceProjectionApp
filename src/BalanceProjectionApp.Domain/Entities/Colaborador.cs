using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Colaborador : Entity
{
    public string Nome { get; private set; } = string.Empty;
    public TipoColaborador Tipo { get; private set; }
    public decimal? PercentagemVenda { get; private set; }
    public decimal? PercentagemAngariacao { get; private set; }
    public decimal? PercentagemServico { get; private set; }

    private Colaborador() { }

    public static Colaborador CriarComercial(string nome, decimal percentagemVenda, decimal percentagemAngariacao)
    {
        ValidarNome(nome);
        ValidarPercentagem(percentagemVenda, nameof(PercentagemVenda));
        ValidarPercentagem(percentagemAngariacao, nameof(PercentagemAngariacao));

        return new Colaborador
        {
            Nome = nome,
            Tipo = TipoColaborador.Comercial,
            PercentagemVenda = percentagemVenda,
            PercentagemAngariacao = percentagemAngariacao
        };
    }

    public static Colaborador CriarServico(string nome, decimal percentagemServico)
    {
        ValidarNome(nome);
        ValidarPercentagem(percentagemServico, nameof(PercentagemServico));

        return new Colaborador
        {
            Nome = nome,
            Tipo = TipoColaborador.Servico,
            PercentagemServico = percentagemServico
        };
    }

    public void Atualizar(string nome, decimal? percentagemVenda = null, decimal? percentagemAngariacao = null, decimal? percentagemServico = null)
    {
        ValidarNome(nome);
        Nome = nome;

        if (Tipo == TipoColaborador.Comercial)
        {
            if (percentagemVenda.HasValue)
            {
                ValidarPercentagem(percentagemVenda.Value, nameof(PercentagemVenda));
                PercentagemVenda = percentagemVenda.Value;
            }
            if (percentagemAngariacao.HasValue)
            {
                ValidarPercentagem(percentagemAngariacao.Value, nameof(PercentagemAngariacao));
                PercentagemAngariacao = percentagemAngariacao.Value;
            }
        }
        else
        {
            if (percentagemServico.HasValue)
            {
                ValidarPercentagem(percentagemServico.Value, nameof(PercentagemServico));
                PercentagemServico = percentagemServico.Value;
            }
        }
    }

    private static void ValidarNome(string nome)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome do colaborador não pode ser vazio.");
    }

    private static void ValidarPercentagem(decimal valor, string campo)
    {
        if (valor < 0 || valor > 100)
            throw new DomainException($"{campo} deve estar entre 0 e 100.");
    }
}
