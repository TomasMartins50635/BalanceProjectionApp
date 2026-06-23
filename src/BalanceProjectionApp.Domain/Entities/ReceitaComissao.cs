using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class ReceitaComissao : Entity
{
    public Guid ReceitaId { get; private set; }
    public Receita Receita { get; private set; } = null!;
    public Guid ColaboradorId { get; private set; }
    public Colaborador Colaborador { get; private set; } = null!;
    public TipoComissao TipoComissao { get; private set; }
    public decimal Percentagem { get; private set; }

    private ReceitaComissao() { }

    internal static ReceitaComissao Criar(Guid receitaId, Colaborador colaborador, TipoComissao tipo, decimal percentagem)
    {
        if (percentagem <= 0 || percentagem > 100)
            throw new DomainException("A percentagem da comissão deve ser superior a 0 e no máximo 100.");

        ValidarCompatibilidade(colaborador, tipo);

        return new ReceitaComissao
        {
            ReceitaId = receitaId,
            ColaboradorId = colaborador.Id,
            Colaborador = colaborador,
            TipoComissao = tipo,
            Percentagem = percentagem
        };
    }

    private static void ValidarCompatibilidade(Colaborador colaborador, TipoComissao tipo)
    {
        if (colaborador.Tipo == TipoColaborador.Comercial && tipo == TipoComissao.Servico)
            throw new DomainException("Um colaborador Comercial não pode ter comissão do tipo Serviço.");

        if (colaborador.Tipo == TipoColaborador.Servico && tipo != TipoComissao.Servico)
            throw new DomainException("Um colaborador de Serviço só pode ter comissão do tipo Serviço.");
    }
}
