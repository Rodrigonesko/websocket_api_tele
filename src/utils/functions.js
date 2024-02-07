const moment = require('moment');
require('moment-business-days');
const Horario = require('../models/Horario');
const User = require('../models/User');
const PropostaEntrevista = require('../models/PropostaEntrevista');

function ExcelDateToJSDate(serial) {
    var utc_days = Math.floor(serial - 25569);
    var utc_value = utc_days * 86400;
    var date_info = new Date(utc_value * 1000);

    var fractional_day = serial - Math.floor(serial) + 0.0000001;

    var total_seconds = Math.floor(86400 * fractional_day);

    var seconds = total_seconds % 60;

    total_seconds -= seconds;

    var hours = Math.floor(total_seconds / (60 * 60));
    var minutes = Math.floor(total_seconds / 60) % 60;

    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

function calcularIdade(data) {
    var now = new Date();
    var today = new Date(now.getYear(), now.getMonth(), now.getDate());

    var yearNow = now.getYear();
    var monthNow = now.getMonth();
    var dateNow = now.getDate();
    var dob = new Date(data.substring(6, 10),
        data.substring(3, 5) - 1,
        data.substring(0, 2)
    );

    var yearDob = dob.getYear();
    var monthDob = dob.getMonth();
    var dateDob = dob.getDate();
    var age = {};
    yearAge = yearNow - yearDob;

    if (monthNow >= monthDob)
        var monthAge = monthNow - monthDob;
    else {
        yearAge--;
        var monthAge = 12 + monthNow - monthDob;
    }

    if (dateNow >= dateDob)
        var dateAge = dateNow - dateDob;
    else {
        monthAge--;
        var dateAge = 31 + dateNow - dateDob;

        if (monthAge < 0) {
            monthAge = 11;
            yearAge--;
        }
    }

    age = {
        years: yearAge,
        months: monthAge,
        days: dateAge
    };
    return age.years;
}

function modeloMensagem1(nome, data1, data2) {

    let mensagem = `Prezado Sr.(a) ${nome},
    Somos da Área de Implantação da Amil e para concluirmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) precisamos confirmar alguns dados médicos.
    Por gentileza, escolha o *NÚMERO* referente a janela de horários para entrarmos em contato com o Sr.(a)
    *${data1}*
    1. Das 12:00 às 14:00
    2. Das 14:00 às 16:00
    3. Das 16:00 às 18:00
    *${data2}*
    4. Das 08:00 às 10:00
    5. Das 10:00 às 12:00
    6. Das 12:00 às 14:00
    7. Das 14:00 às 16:00
    8. Das 16:00 às 18:00
    Qual o melhor horário?
    Informamos que vamos ligar dos números 11 42404975 ou 42403554, pedimos tirar do spam para evitar bloqueio da ligação. Desde já agradecemos.
    Atenção: o preenchimento dos horários é feito em tempo real. Caso o horário informado não esteja mais disponível, apresentarei uma nova opção.
    Lembrando que em caso de menor de idade a entrevista será realizada com o responsável legal, não necessitando da presença do menor no momento da ligação.`

    return { data1, data2, mensagem }
}
function modeloMensagem2(nome, data1, data2) {

    let mensagem = `Prezado Sr.(a) ${nome},
    Somos da Área de Implantação da Amil e para concluirmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) precisamos confirmar alguns dados médicos.
    Por gentileza, escolha o *NÚMERO* referente a janela de horários para entrarmos em contato com o Sr.(a)
    *${data1}*
    1. Das 08:00 às 10:00
    2. Das 10:00 às 12:00
    3. Das 12:00 às 14:00
    4. Das 14:00 às 16:00
    5. Das 16:00 às 18:00
    *${data2}*
    6. Das 08:00 às 10:00
    7. Das 10:00 às 12:00
    8. Das 12:00 às 14:00
    9. Das 14:00 às 16:00
    10. Das 16:00 às 18:00
    Qual o melhor horário?
    Informamos que vamos ligar dos números 11 42404975 ou 42403554, pedimos tirar do spam para evitar bloqueio da ligação. Desde já agradecemos.
    Atenção: o preenchimento dos horários é feito em tempo real. Caso o horário informado não esteja mais disponível, apresentarei uma nova opção.
    Lembrando que em caso de menor de idade a entrevista será realizada com o responsável legal, não necessitando da presença do menor no momento da ligação.`

    return { data1, data2, mensagem }
}



function calcularDiasUteis(dataInicio, dataFim, feriados) {
    let diasUteis = 0;
    let dataAtual = moment(dataInicio);

    while (dataAtual.isSameOrBefore(dataFim, 'day')) {
        if (dataAtual.isBusinessDay() && !feriados.some(feriado => feriado.isSame(dataAtual, 'day'))) {
            diasUteis++;
        }
        dataAtual.add(1, 'day');
    }

    return diasUteis - 1;
}

async function buscarDiasDisponiveis() {
    let hoje = new Date();
    let dd = String(hoje.getDate()).padStart(2, '0');
    let mm = String(hoje.getMonth() + 1).padStart(2, '0'); // Janeiro é 0!
    let yyyy = hoje.getFullYear();

    hoje = yyyy + '-' + mm + '-' + dd;

    const horarios = await Horario.find({
        dia: { $gt: hoje }, // $gte significa "maior ou igual a"
        agendado: { $ne: 'Agendado' }
    });

    let diasDisponiveis = horarios.map(horario => horario.dia);

    diasDisponiveis = [...new Set(diasDisponiveis)];

    return diasDisponiveis;
}

async function buscarHorariosDisponiveis(dia) {
    const horarios = await Horario.find({
        dia,
        agendado: { $ne: 'Agendado' }
    });

    let horariosDisponiveis = horarios.map(horario => horario.horario);

    horariosDisponiveis = [...new Set(horariosDisponiveis)];

    return horariosDisponiveis.sort();
}

async function verificarHorarioDisponivel(dia, horario) {
    const horarios = await Horario.find({
        dia,
        horario,
        agendado: { $ne: 'Agendado' }
    });

    return horarios.length > 0;
}

async function horariosDisponiveis(dia, dependentes) {

    const users = await User.find({
        atividadePrincipal: 'Tele Entrevista',
        inativo: { $ne: true }
    }).lean()

    const enfermeiros = users.map(user => user.name)

    for (const enfermeiro of enfermeiros) {

        const horarios = await Horario.find({
            dia,
            enfermeiro,
        }).lean()

        for (let i = 0; i < horarios.length; i++) {
            const element = horarios[i];
            console.log(element);
        }
    }

}

async function enfermeiraComMenosAgendamentos(horario, dia) {

    let enfermeiroComAAgendaMaisLivre = null;
    let maxAgendamentos = 0;

    let horarios = await Horario.find({
        dia,
        horario,
        agendado: { $ne: 'Agendado' }
    }).lean()

    const enfermeiros = horarios.map(horario => horario.enfermeiro)

    for (const enfermeiro of enfermeiros) {
        const agendamentos = await Horario.find({
            enfermeiro,
            dia,
            agendado: { $ne: 'Agendado' }
        }).lean()

        if (agendamentos.length > maxAgendamentos) {
            maxAgendamentos = agendamentos.length;
            enfermeiroComAAgendaMaisLivre = enfermeiro;
        }
    }
    return enfermeiroComAAgendaMaisLivre;
}

async function verificarDependentesMenoresDeIdade(cpfTitular) {
    const dependentes = await PropostaEntrevista.find({
        cpfTitular,
        idade: { $lt: 9 },
        tipoAssociado: { $regex: /Dependente/ }
    }).lean()

    return dependentes
}

const holidays = [
    '2022-01-01',
    '2022-04-21',
    '2022-05-01',
    '2022-09-07',
    '2022-10-12',
    '2022-11-02',
    '2022-11-15',
    '2022-12-25',
    '2023-01-01',
    '2023-02-20',
    '2023-02-21',
    '2023-02-22',
    '2023-04-07',
    '2023-04-21',
    '2023-05-01',
    '2023-06-08',
    '2023-09-07',
    '2023-10-12',
    '2023-11-02',
    '2023-11-15',
    '2023-12-25',
    '2024-01-01',
    '2024-02-12',
    '2024-02-13',
    '2024-03-29',
    '2024-04-21',
    '2024-05-01',
    '2024-05-30',
    '2024-09-07',
    '2024-10-12',
    '2024-11-02',
    '2024-11-15',
    '2024-11-20',
    '2024-12-25',
];

function countWeekdaysInMonth(year, month) {
    let count = 0;
    let date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        if (date.getDay() !== 0 && date.getDay() !== 6) {
            // Dia da semana não é sábado nem domingo
            let dateString = date.toISOString().split('T')[0]; // Formato: 'yyyy-mm-dd'
            if (!holidays.includes(dateString)) {
                // A data não é um feriado
                count++;
            }
        }
        date.setDate(date.getDate() + 1);
    }
    return count;
}

async function criarLog() {

}

module.exports = {
    ExcelDateToJSDate,
    calcularIdade,
    modeloMensagem1,
    modeloMensagem2,
    calcularDiasUteis,
    buscarDiasDisponiveis,
    buscarHorariosDisponiveis,
    enfermeiraComMenosAgendamentos,
    horariosDisponiveis,
    verificarHorarioDisponivel,
    verificarDependentesMenoresDeIdade,
    countWeekdaysInMonth
}

