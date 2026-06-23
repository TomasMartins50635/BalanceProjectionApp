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

    private readonly List<Parcela> _parcelas = [];
    public IReadOnlyCollection<Parcela> Parcelas => _parcelas.AsReadOnly();

    private readonly List<ReceitaComissao> _comissoes = [];
    public IReadOnlyCollection<ReceitaComissao> Comissoes => _comissoes.AsReadOnly();

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

    public ReceitaComissao AdicionarComissao(Colaborador colaborador, TipoComissao tipo, decimal percentagem)
    {
        var somaActual = _comissoes.Where(c => !c.IsDeleted).Sum(c => c.Percentagem);
        if (somaActual + percentagem > 100)
            throw new DomainException($"A soma das comissões não pode ultrapassar 100%. Actual: {somaActual}%, a adicionar: {percentagem}%.");

        var comissao = ReceitaComissao.Criar(Id, colaborador, tipo, percentagem);
        _comissoes.Add(comissao);
        return comissao;
    }

    public void RemoverComissao(Guid comissaoId)
    {
        var comissao = _comissoes.FirstOrDefault(c => c.Id == comissaoId && !c.IsDeleted)
            ?? throw new DomainException("Comissão não encontrada.");
        comissao.Deletar();
    }

    public Parcela AdicionarParcela(int numero, DateOnly dataVencimento, decimal valor)
    {
        if (valor <= 0)
            throw new DomainException($"O valor da parcela {numero} deve ser positivo.");

        if (_parcelas.Any(p => p.Numero == numero && !p.IsDeleted))
            throw new DomainException($"Já existe uma parcela com o número {numero} nesta receita.");

        var totalPercentagem = _comissoes.Where(c => !c.IsDeleted).Sum(c => c.Percentagem);
        var valorLiquido = Math.Round(valor * (1 - totalPercentagem / 100m), 2);

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
