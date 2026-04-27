using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Receita : Entity
{
    public string Nome { get; private set; } = string.Empty;
    public CategoriaReceita? Categoria { get; private set; }
    public Guid ContaId { get; private set; }
    public Conta Conta { get; private set; } = null!;
    public Guid? ColaboradorId { get; private set; }
    public Colaborador? Colaborador { get; private set; }

    private readonly List<Parcela> _parcelas = [];
    public IReadOnlyCollection<Parcela> Parcelas => _parcelas.AsReadOnly();

    private Receita() { }

    public static Receita Criar(string nome, Guid contaId, CategoriaReceita? categoria = null)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da receita não pode ser vazio.");

        return new Receita { Nome = nome, ContaId = contaId, Categoria = categoria };
    }

    public void Atualizar(string nome, CategoriaReceita? categoria)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da receita não pode ser vazio.");

        Nome = nome;
        Categoria = categoria;
    }

    public void AssociarColaborador(Colaborador colaborador)
    {
        ColaboradorId = colaborador.Id;
        Colaborador = colaborador;
    }

    public void RemoverColaborador()
    {
        ColaboradorId = null;
        Colaborador = null;
    }

    public Parcela AdicionarParcela(int numero, DateOnly dataVencimento, decimal valor)
    {
        if (valor <= 0)
            throw new DomainException($"O valor da parcela {numero} deve ser positivo.");

        if (_parcelas.Any(p => p.Numero == numero && !p.IsDeleted))
            throw new DomainException($"Já existe uma parcela com o número {numero} nesta receita.");

        decimal valorComissao = 0m;
        if (ColaboradorId.HasValue)
        {
            if (Colaborador is null)
                throw new InvalidOperationException("Colaborador navigation property must be loaded before adding parcelas.");
            valorComissao = Math.Round(valor * Colaborador.Percentagem / 100m, 2);
        }
        var valorLiquido = valor - valorComissao;

        var parcela = Parcela.Criar(numero, dataVencimento, valor, valorLiquido, ContaId, Id, null);
        _parcelas.Add(parcela);
        return parcela;
    }

    public IReadOnlyList<Guid> RemoverParcelasNaoPagas()
    {
        var naoPagas = _parcelas.Where(p => !p.IsPaid && !p.IsDeleted).ToList();
        foreach (var p in naoPagas)
            p.Deletar();
        return naoPagas.Select(p => p.Id).ToList();
    }
}
