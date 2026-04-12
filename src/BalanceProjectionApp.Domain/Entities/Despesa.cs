using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Despesa : Entity
{
    public string Nome { get; private set; } = string.Empty;
    public CategoriaContrato? Categoria { get; private set; }
    public Guid ContaId { get; private set; }
    public Conta Conta { get; private set; } = null!;

    private readonly List<Parcela> _parcelas = [];
    public IReadOnlyCollection<Parcela> Parcelas => _parcelas.AsReadOnly();

    private Despesa() { }

    public static Despesa Criar(string nome, Guid contaId, CategoriaContrato? categoria = null)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da despesa não pode ser vazio.");

        return new Despesa { Nome = nome, ContaId = contaId, Categoria = categoria };
    }

    public Parcela AdicionarParcela(int numero, DateOnly dataVencimento, decimal valorBruto)
    {
        if (_parcelas.Any(p => p.Numero == numero))
            throw new DomainException($"Já existe uma parcela com o número {numero} nesta despesa.");

        // Nas despesas não há comissão: ValorLiquido = ValorBruto
        var parcela = Parcela.Criar(numero, dataVencimento, valorBruto, valorBruto, ContaId, null, Id);
        _parcelas.Add(parcela);
        return parcela;
    }
}
