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

    public TipoDespesa TipoDespesa { get; private set; } = TipoDespesa.Pontual;

    // Campos exclusivos de despesas Fixas
    public decimal? ValorFixo { get; private set; }
    public Periodicidade? Periodicidade { get; private set; }
    public DateOnly? DataInicio { get; private set; }
    public bool IsActive { get; private set; }

    private readonly List<Parcela> _parcelas = [];
    public IReadOnlyCollection<Parcela> Parcelas => _parcelas.AsReadOnly();

    private Despesa() { }

    public static Despesa Criar(string nome, Guid contaId, CategoriaContrato? categoria = null,
        TipoDespesa tipo = TipoDespesa.Pontual, decimal? valorFixo = null,
        Periodicidade? periodicidade = null, DateOnly? dataInicio = null)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da despesa não pode ser vazio.");

        if (tipo == TipoDespesa.Fixa)
        {
            if (valorFixo is null or <= 0)
                throw new DomainException("Despesa fixa requer um valor fixo positivo.");
            if (periodicidade is null)
                throw new DomainException("Despesa fixa requer uma periodicidade.");
            if (dataInicio is null)
                throw new DomainException("Despesa fixa requer uma data de início.");
        }

        return new Despesa
        {
            Nome = nome,
            ContaId = contaId,
            Categoria = categoria,
            TipoDespesa = tipo,
            ValorFixo = valorFixo,
            Periodicidade = periodicidade,
            DataInicio = dataInicio,
            IsActive = tipo == TipoDespesa.Fixa
        };
    }

    public Parcela AdicionarParcela(int numero, DateOnly dataVencimento, decimal valorBruto)
    {
        if (_parcelas.Any(p => p.Numero == numero))
            throw new DomainException($"Já existe uma parcela com o número {numero} nesta despesa.");

        var parcela = Parcela.Criar(numero, dataVencimento, valorBruto, valorBruto, ContaId, null, Id);
        _parcelas.Add(parcela);
        return parcela;
    }

    /// <summary>
    /// Gera parcelas fixas para os próximos <paramref name="meses"/> meses a partir de DataInicio.
    /// Apenas aplicável a despesas do tipo Fixa.
    /// </summary>
    public IReadOnlyList<Parcela> GerarParcelasFixas(int meses = 12)
    {
        if (TipoDespesa != TipoDespesa.Fixa)
            throw new DomainException("Apenas despesas fixas podem gerar parcelas automaticamente.");

        var intervaloMeses = Periodicidade switch
        {
            Enums.Periodicidade.Mensal => 1,
            Enums.Periodicidade.Trimestral => 3,
            Enums.Periodicidade.Semestral => 6,
            Enums.Periodicidade.Anual => 12,
            _ => throw new DomainException("Periodicidade inválida.")
        };

        var dataFim = DataInicio!.Value.AddMonths(meses);
        var data = DataInicio!.Value;
        var numero = _parcelas.Count == 0 ? 1 : _parcelas.Max(p => p.Numero) + 1;
        var geradas = new List<Parcela>();

        while (data < dataFim)
        {
            var parcela = Parcela.Criar(numero++, data, ValorFixo!.Value, ValorFixo!.Value, ContaId, null, Id);
            _parcelas.Add(parcela);
            geradas.Add(parcela);
            data = data.AddMonths(intervaloMeses);
        }

        return geradas.AsReadOnly();
    }

    public void Atualizar(string nome, CategoriaContrato? categoria)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da despesa não pode ser vazio.");

        Nome = nome;
        Categoria = categoria;
    }

    public void AtualizarValorFixo(decimal valorFixo)
    {
        if (TipoDespesa != TipoDespesa.Fixa)
            throw new DomainException("Apenas despesas fixas têm valor fixo.");

        if (valorFixo <= 0)
            throw new DomainException("O valor fixo deve ser positivo.");

        ValorFixo = valorFixo;

        foreach (var p in _parcelas.Where(p => !p.IsPaid))
            p.AtualizarValor(valorFixo);
    }

    public void RemoverParcelasNaoLiquidadas()
    {
        _parcelas.RemoveAll(p => !p.IsPaid);
    }

    public void Desativar() => IsActive = false;
    public void Ativar() => IsActive = true;
}
