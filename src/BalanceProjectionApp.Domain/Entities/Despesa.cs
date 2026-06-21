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

    // Campos de despesas Fixas e Recorrentes
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

        if (tipo != TipoDespesa.Pontual)
        {
            if (valorFixo is null or <= 0)
                throw new DomainException("Despesa fixa ou recorrente requer um valor positivo.");
            if (dataInicio is null)
                throw new DomainException("Despesa fixa ou recorrente requer uma data de início.");
        }

        if ((tipo == TipoDespesa.Fixa || tipo == TipoDespesa.Recorrente) && periodicidade is null)
        {
            throw new DomainException($"Despesa {tipo} requer uma periodicidade.");
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
            IsActive = tipo != TipoDespesa.Pontual
        };
    }

    public Parcela AdicionarParcela(int numero, DateOnly dataVencimento, decimal valorBruto)
    {
        if (_parcelas.Any(p => p.Numero == numero && !p.IsDeleted))
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
        var ativas = _parcelas.Where(p => !p.IsDeleted).ToList();
        var numero = ativas.Count == 0 ? 1 : ativas.Max(p => p.Numero) + 1;
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

    /// <summary>
    /// Gera a próxima parcela pendente para despesas Fixas ou Recorrentes.
    /// Para Fixa usa o ValorFixo e a Periodicidade para calcular a data.
    /// Para Recorrente usa o ValorFixo e incrementa 1 mês.
    /// </summary>
    public Parcela GerarProximaParcela()
    {
        if (TipoDespesa == TipoDespesa.Pontual)
            throw new DomainException("Despesas pontuais não geram parcelas automaticamente.");

        DateOnly dataVencimento;

        var parcelasAtivas = _parcelas.Where(p => !p.IsDeleted).ToList();
        if (parcelasAtivas.Count == 0)
        {
            if (DataInicio is null)
                throw new DomainException("DataInicio é obrigatória para gerar a primeira parcela.");
            dataVencimento = DataInicio.Value;
        }
        else
        {
            var ultimaData = parcelasAtivas.Max(p => p.DataVencimento);

            var meses = Periodicidade switch
            {
                Enums.Periodicidade.Mensal     => 1,
                Enums.Periodicidade.Trimestral => 3,
                Enums.Periodicidade.Semestral  => 6,
                Enums.Periodicidade.Anual      => 12,
                _ => throw new DomainException("Periodicidade inválida.")
            };
            dataVencimento = ultimaData.AddMonths(meses);
        }

        decimal valor;
        if (TipoDespesa == TipoDespesa.Fixa)
        {
            valor = ValorFixo ?? throw new DomainException("Valor fixo não definido.");
        }
        else // Recorrente — média das parcelas existentes, ou ValorFixo se ainda não houver nenhuma
        {
            valor = parcelasAtivas.Count > 0
                ? parcelasAtivas.Average(p => p.ValorLiquido)
                : ValorFixo ?? throw new DomainException("Valor previsto não definido.");
        }

        var numero = parcelasAtivas.Count == 0 ? 1 : parcelasAtivas.Max(p => p.Numero) + 1;
        var parcela = Parcela.Criar(numero, dataVencimento, valor, valor, ContaId, null, Id);
        _parcelas.Add(parcela);
        return parcela;
    }

    public void Atualizar(string nome, CategoriaContrato? categoria)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da despesa não pode ser vazio.");

        Nome = nome;
        Categoria = categoria;
    }

    public void AtualizarPeriodicidade(Periodicidade periodicidade)
    {
        if (TipoDespesa == TipoDespesa.Pontual)
            throw new DomainException("Apenas despesas fixas ou recorrentes têm periodicidade.");
        Periodicidade = periodicidade;
    }

    public void AtualizarValorFixo(decimal valorFixo)
    {
        if (TipoDespesa == TipoDespesa.Pontual)
            throw new DomainException("Apenas despesas fixas ou recorrentes têm valor base.");

        if (valorFixo <= 0)
            throw new DomainException("O valor fixo deve ser positivo.");

        ValorFixo = valorFixo;

        foreach (var p in _parcelas.Where(p => !p.IsPaid))
            p.AtualizarValor(valorFixo);
    }

    public void RemoverParcelasNaoLiquidadas()
    {
        foreach (var p in _parcelas.Where(p => !p.IsPaid && !p.IsDeleted))
            p.Deletar();
    }

    public void Desativar() => IsActive = false;
    public void Ativar() => IsActive = true;
}
