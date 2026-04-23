using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Receita : Entity
{
    public string Nome { get; private set; } = string.Empty;
    public string? Categoria { get; private set; }
    public decimal ValorTotal { get; private set; }
    public Guid ContaId { get; private set; }
    public Conta Conta { get; private set; } = null!;
    public Guid? ColaboradorId { get; private set; }
    public Colaborador? Colaborador { get; private set; }

    private readonly List<Parcela> _parcelas = [];
    public IReadOnlyCollection<Parcela> Parcelas => _parcelas.AsReadOnly();

    private Receita() { }

    public static Receita Criar(string nome, Guid contaId, decimal valorTotal, string? categoria = null)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da receita não pode ser vazio.");

        if (valorTotal <= 0)
            throw new DomainException("O valor total da receita deve ser positivo.");

        return new Receita { Nome = nome, ContaId = contaId, ValorTotal = valorTotal, Categoria = categoria };
    }

    public void Atualizar(string nome, string? categoria, decimal valorTotal)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da receita não pode ser vazio.");

        if (valorTotal <= 0)
            throw new DomainException("O valor total da receita deve ser positivo.");

        Nome = nome;
        Categoria = categoria;
        ValorTotal = valorTotal;
    }

    public void Remover()
    {
        if (IsDeleted)
            throw new DomainException("A receita já se encontra removida.");

        IsDeleted = true;
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

    public Parcela AdicionarParcela(int numero, DateOnly dataVencimento, decimal percentagem)
    {
        if (percentagem <= 0 || percentagem > 100)
            throw new DomainException($"A percentagem da parcela {numero} deve estar entre 0 e 100.");

        if (_parcelas.Any(p => p.Numero == numero))
            throw new DomainException($"Já existe uma parcela com o número {numero} nesta receita.");

        var valorBruto = Math.Round(ValorTotal * percentagem / 100m, 2);
        decimal valorComissao = 0m;
        if (ColaboradorId.HasValue)
        {
            if (Colaborador is null)
                throw new InvalidOperationException("Colaborador navigation property must be loaded before adding parcelas.");
            valorComissao = Math.Round(valorBruto * Colaborador.Percentagem / 100m, 2);
        }
        var valorLiquido = valorBruto - valorComissao;

        var parcela = Parcela.Criar(numero, dataVencimento, valorBruto, valorLiquido, ContaId, Id, null, percentagem);
        _parcelas.Add(parcela);
        return parcela;
    }

    /// <summary>Remove todas as parcelas não liquidadas. Retorna os IDs removidos.</summary>
    public IReadOnlyList<Guid> RemoverParcelasNaoPagas()
    {
        var naoPagas = _parcelas.Where(p => !p.IsPaid).ToList();
        foreach (var p in naoPagas)
            _parcelas.Remove(p);
        return naoPagas.Select(p => p.Id).ToList();
    }
}
