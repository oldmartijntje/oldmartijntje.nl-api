<?php

$commands = [
    ":shrug:" => "¯\\_(ツ)_/¯",
    ":heart:" => "♥",
    ":heart2:" => "❤",
    ":uwu:" => "(✿◡‿◡)",
    ":owo:" => "＼（〇_ｏ）／",
    ":twt:" => "〒▽〒",
    ":tableflip:" => "(╯°□°）╯︵ ┻━┻",
    ":unflip:" => "┬─┬ノ( º _ ºノ)",
    ":rick:" => "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ":sus:" => "ඞ",
    ":face:" => "👁👄👁",
    ":crown:" => "👑",
    ":sparkle:" => "✨",
    "genshin" => "genshit",
    ":butterfly:" => "🦋",
    ":fox:" => "🦊",
    ":pregnantMan:" => "🫃",
    ":curlyLine:" => "~",
    ":nerd:" => "🤓",
    ":cool:" => "😎",
    ":eyes:" => "👀",
    ":checkmark:" => "✔",
    ":cross:" => "❌",
    ":nuclear:" => "☢",
    ":fire:" => "🔥",
    ":water:" => "💧",
    ":toilet:" => "🚽",
    ":paper:" => "🧻",
    ":TM:" => "™",
    ":wet:" => "💦",
    ":copyright:" => "©",
    ":sad:" => "( ˘︹˘ )",
    ":angwy:" => "ヽ（≧□≦）ノ",
    ":creepySmile:" => "( ͡• ͜ʖ ͡• )",
    ":creepySmile2:" => "( ͠° ͟ʖ ͡°)",
    ":creepyShrug:" => "¯\_( ͡° ͜ʖ ͡°)_/¯",
    ":creepySmile3:" => "(ʘ ͟ʖ ʘ)",
    ":creepySmile4:" => "( ͡~ ͜ʖ ͡°)",
    ":lennyFace:" => "( ͡° ͜ʖ ͡°)",
    ":tongue:" => "👅",
    ":tongue2:" => "😛",
    ":tongue3:" => "😜",
    ":tongue4:" => "😝",
    ":eye:" => "👁",
    ":cactus:" => "🌵",
    ":heghog:" => "🦔",
    ":cat:" => "🐱",
    "owo" => "OwO",
    "uwu" => "UwU",
    "twt" => "TwT",
    ":adBee:"=> "https://oldmartijntje.nl/AdBee?nav=",
    ":smallerThan:" => "<",
    ":biggerThan:" => ">",
    ":doubleQuote:" => '"',
    ":and:" => "&",
    ":singleQuote:" => "'",
    ":backtick:" => "`",
];

$commandsList = [
    "ban", "unban"
];

$typeMask = [
    "admin" => "oldmartijntje",
    "visualAdmin" => "oldmartijntje"
];

function checkForCommands($input) {
    global $commands;

    foreach ($commands as $command => $replacement) {
        if (strpos($input, $command) !== false) {
            // Replace the command with its corresponding value
            $input = str_replace($command, $replacement, $input);
        }
    }

    return $input;
}

function applyMask($input) {
    global $typeMask;

    if (isset($typeMask[$input])) {
        return $typeMask[$input];
    } else {
        return $input;
    }
}

function isCommand($data) {
    global $commandsList;
    
    // Escape special characters in each command for use in regex
    $escapedCommands = array_map('preg_quote', $commandsList);
    
    // Create a regex pattern to match any of the commands
    $pattern = "/^\/(" . implode('|', $escapedCommands) . ")(?:\s|$)/";

    // Check if $data starts with one of the commands followed by a space or the end of the string
    $startsWithCommand = preg_match($pattern, $data) === 1;

    return $startsWithCommand;
}

function splitCommand($data) {
    // Use preg_split to split the command at the space character
    $parts = preg_split('/\s+/', $data, 2);

    // Return an array with the command and argument (if any)
    return $parts;
}

?>