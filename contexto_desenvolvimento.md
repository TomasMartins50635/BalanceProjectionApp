# Contexto do Projeto: Sistema de Gestão Financeira e Faturação

## 1. Visão Geral
Este projeto consiste no desenvolvimento de uma aplicação de gestão financeira focada no controlo de saldo bancário, faturação e despesas. O sistema diferencia-se por gerir o fluxo de caixa através da liquidação individual de **Parcelas** e não pelos valores totais dos contratos.

## 2. Propósito
O objetivo principal é permitir uma gestão rigorosa do saldo real e previsto, garantindo que deduções (como comissões) sejam processadas apenas no momento em que o dinheiro entra efetivamente na conta.

## 3. Arquitetura de Dados e Regras de Negócio

### A. Entidade Conta
- Responsável por armazenar o saldo.
- O saldo é **dinâmico**: calculado através da soma de recebimentos menos as despesas, considerando apenas o que está marcado como pago.

### B. Receitas e Despesas (Contratos)
- Funcionam como cabeçalhos ou "entidades pai".
- Agrupam as regras gerais (Nome, Categoria, Tipo).
- O valor total é meramente informativo; a operação financeira ocorre nas parcelas.

### C. Lógica de Parcelas (O Core do Sistema)
- Cada Receita ou Despesa divide-se em **Parcelas**.
- Campos essenciais: `Data de Vencimento`, `Valor Bruto`, `Valor Líquido`, `isPaid` (estado do pagamento).
- O impacto no saldo da conta ocorre parcela a parcela.

### D. Gestão de Comissões
- As comissões são associadas à **Receita** (configuração).
- **Execução:** A dedução da comissão é feita diretamente na **Parcela**.
- **Cálculo:** `Valor Líquido da Parcela = Valor Bruto - Valor da Comissão`.
- Apenas o `Valor Líquido` é somado ao saldo da conta quando a parcela de uma receita é liquidada.

### E. Financiamentos
- Entradas de capital externo que somam ao saldo.
- Podem estar vinculadas a **Despesas Associadas** para rastreabilidade de custos financiados.

## 4. Diretrizes para a IA Assistente
Ao auxiliar no desenvolvimento, deves:
1. **Priorizar o Fluxo de Parcelas:** Nunca calcules o saldo com base no valor total da Receita/Despesa, mas sim no estado das suas parcelas.
2. **Cálculos de Dedução:** Garantir que as comissões são deduzidas no momento da entrada (Receita).
3. **Integridade de Dados:** Sugerir modelos de base de dados que suportem estas relações (One-to-Many entre Contratos e Parcelas).
