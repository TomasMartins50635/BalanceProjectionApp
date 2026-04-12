using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Receita : Entity
{
    public string Nome { get; private set; } = string.Empty;
    public CategoriaContrato? Categoria { get; private set; }
    public Guid ContaId { get; private set; }
    public Conta Conta { get; private set; } = null!;
    public Comissao? Comissao { get; private set; }

    private readonly List<Parcela> _parcelas = [];
    public IReadOnlyCollection<Parcela> Parcelas => _parcelas.AsReadOnly();

    private Receita() { }

    public static Receita Criar(string nome, Guid contaId, CategoriaContrato? categoria = null)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da receita não pode ser vazio.");

        return new Receita { Nome = nome, ContaId = contaId, Categoria = categoria };
    }

    public void DefinirComissao(decimal percentagem)
    {
        Comissao = Comissao.Criar(percentagem, Id);
    }

    public Parcela AdicionarParcela(int numero, DateOnly dataVencimento, decimal valorBruto)
    {
        if (_parcelas.Any(p => p.Numero == numero))
            throw new DomainException($"Já existe uma parcela com o número {numero} nesta receita.");

        var valorComissao = Comissao?.Calcular(valorBruto) ?? 0m;
        var valorLiquido = valorBruto - valorComissao;

        var parcela = Parcela.Criar(numero, dataVencimento, valorBruto, valorLiquido, ContaId, Id, null);
        _parcelas.Add(parcela);
        return parcela;
    }
}
