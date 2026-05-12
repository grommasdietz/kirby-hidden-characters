<?php

/** @var Kirby\Cms\Page $page */
/** @var Kirby\Cms\Site $site */
?>

<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= $site->title() ?></title>
</head>

<body>
    <header>
        <p data-test="site-title"><?= $site->title()->escape() ?></p>
    </header>
    <main>
        <h1><?= $page->title()->escape() ?></h1>
        <p data-test="page-id"><?= $page->id() ?></p>
        <?php if ($page->text()->isNotEmpty()): ?>
            <div data-test="page-text">
                <?= $page->text()->kirbytext() ?>
            </div>
        <?php endif ?>
    </main>
</body>

</html>
