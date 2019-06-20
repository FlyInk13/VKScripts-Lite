const userAuth = `vk.auth('friends'); // Получаем права

// Запрашиваем инфо из API
var friends = API.friends.get({ fields: 'online' });
var user = API.users.get({});

var friendName = friends.items[0].first_name;
var userName = user[0].first_name;

// Вызываем prompt
var userNumber = prompt('Любимое число?');

// Приветствуем
var hello = 'Привет ' + userName + '\\nТвой друг: ' + friendName + '\\nТвое число: ' + userNumber;
document.body.innerHTML = 'В body: ' + hello.split('\\n').join('<br>');
console.log('И в консоль:', hello);
alert('И в alert: ' + hello);
`;

const groupAuth = `// Данные для рассылки
var group_id = 1;
var message = \`Привет.\`;

// Получаем права
vk.auth('messages', group_id);

// Получаем диалоги без ответа
var conversations = API.messages.getConversations({ filter: "unanswered", count: 200 });
var items = conversations.items;
var item;

// Рассылаем сообщения
while(items.length) {
    item = items.pop();
    item.peer_id = item.conversation.peer.id;
    item.response = API.messages.send({
        error: 1, // Принимаем ошибку как результат 
        group_id: group_id,
        random_id: item.peer_id,
        peer_id: item.peer_id,
        message: message
    });
    console.log(item.response);
}
`;

const viewAll = `
vk.auth('');
document.body.innerHTML = '';

var keys = API.storage.getKeys({
    global: 1,
});

var df = document.createDocumentFragment();

keys.forEach((key) => {
    var link = document.createElement('a');
    link.style.display = 'block';
    link.target = '_blank';
    link.href = 'https://vk.com/app6979558#' + key;
    link.textContent = key;
    df.appendChild(link);
});

document.body.appendChild(df);
`;

const consoleText = `Добро пожаловать в VKScripts Lite:
- Запускайте скрипт, только если понимаете, как он работает и что делает 
- Скрипты выполняются не в песочнице и имеют доступ ко всему приложению 
- Для запуска скрипта нажимте кнопку + 
- Для очистки консоли нажмите на закрытие вкладки 
- Вы можете развернуть вкладку на весь экран, нажав 2 раза на активную вкладку 
- Вкладку при запуске меняет, только если в коде есть работа с DOM
- Подробнее: https://github.com/FlyInk13/VKScripts-Lite/
`;

const saveText = `Введите имя скрипта [a-zA-Z_-0-9].
Личный скрипт: ".scriptName"
Зашифрованный скрипт: "scriptName:password"
`;

const sendKeyboard = `
const group_id = 181108510;

// Разрешаем сообщения группы
vk.connect("VKWebAppAllowMessagesFromGroup", { group_id });
// Получаем токен группы
vk.auth('messages', group_id); 

// Вызываем метод
const response = API.messages.send({
    peer_id: 61351294,
    message: 'test',
    keyboard: JSON.stringify({
        "one_time": false,
        "buttons": [
            [{
                "action": {
                    "type": "location",
                    "payload": "{\\"button\\": \\"1\\"}"
                }
            }],
            [{
                "action": {
                    "type": "open_app",
                    "app_id": 6979558,
                    "owner_id": -group_id,
                    "hash": "sendKeyboard",
                    "label": "Отправить клавиатуру"
                }
            }],
            [{
                "action": {
                    "type": "vkpay",
                    "hash": "action=transfer-to-group&group_id=" + group_id + "&aid=10"
                }
            }],
            [{
                    "action": {
                        "type": "text",
                        "payload": "{\\"button\\": \\"1\\"}",
                        "label": "Negative"
                    },
                    "color": "negative"
                },
                {
                    "action": {
                        "type": "text",
                        "payload": "{\\"button\\": \\"2\\"}",
                        "label": "Positive"
                    },
                    "color": "positive"
                },
                {
                    "action": {
                        "type": "text",
                        "payload": "{\\"button\\": \\"2\\"}",
                        "label": "Primary"
                    },
                    "color": "primary"
                },
                {
                    "action": {
                        "type": "text",
                        "payload": "{\\"button\\": \\"2\\"}",
                        "label": "Secondary"
                    },
                    "color": "secondary"
                }
            ]
        ]
    })
});

// Выводим данные и закрываем вкладку
return close(response);
`;

export default {
  userAuth,
  groupAuth,
  consoleText,
  saveText,
  viewAll,
  sendKeyboard
};
