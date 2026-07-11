# 📁 Dossier `exemples` - Fichiers LaTeX pour les Équations Différentielles (test7)

Ce dossier contient des exemples de documents LaTeX illustrant la résolution d'**équations différentielles**. Les fichiers sont prêts à être compilés avec un compilateur LaTeX comme `pdflatex`, `xelatex`, ou via des plateformes en ligne comme [Overleaf](https://www.overleaf.com/).

---

## 📄 Fichiers Disponibles

| Fichier | Description | Niveau |
|---------|-------------|--------|
| [`equations_differentielles.tex`](./equations_differentielles.tex) | Document complet avec théorie, exemples, graphiques (TikZ), et exercices. | Avancé |
| [`equations_differentielles_simple.tex`](./equations_differentielles_simple.tex) | Version simplifiée avec des exemples basiques et des solutions détaillées. | Débutant/Intermédiaire |

---

## 🚀 Comment Utiliser Ces Fichiers ?

### 1️⃣ **En Ligne (Recommandé pour les Débutants)**
- **Overleaf** :
  1. Va sur [Overleaf](https://www.overleaf.com/).
  2. Crée un nouveau projet.
  3. Copie-colle le contenu d'un fichier `.tex` dans ton projet.
  4. Compile pour voir le résultat.

- **ShareLaTeX** :
  Fonctionne de la même manière qu'Overleaf.

---

### 2️⃣ **En Local (Pour les Utilisateurs Avancés)**

#### 📌 **Prérequis**
- Une distribution LaTeX installée :
  - **Linux/macOS** : [TeX Live](https://www.tug.org/texlive/)
  - **Windows** : [MiKTeX](https://miktex.org/)
- Un éditeur LaTeX :
  - [TeXstudio](https://www.texstudio.org/) (recommandé)
  - [VS Code](https://code.visualstudio.com/) avec l'extension **LaTeX Workshop**
  - [TeXmaker](http://www.xm1math.net/texmaker/)

#### 🔨 **Compilation**
1. Ouvre un terminal dans ce dossier.
2. Compile avec `pdflatex` :
   ```bash
   pdflatex equations_differentielles.tex
   ```
   ou pour le fichier simple :
   ```bash
   pdflatex equations_differentielles_simple.tex
   ```
3. Le fichier PDF généré (`equations_differentielles.pdf` ou `equations_differentielles_simple.pdf`) contiendra le document compilé.

> ⚠️ **Note** : Si ton document contient des graphiques (TikZ), assure-toi que ton compilateur prend en charge `pgfplots`. Utilise `pdflatex` ou `xelatex` pour une compatibilité optimale.

---

## 🧪 Test des Fichiers

Pour tester les fichiers LaTeX et vérifier qu'ils compilent correctement, suis ces étapes :

### 1️⃣ **Test en Ligne (Overleaf/ShareLaTeX)**
1. Importe le fichier `.tex` dans un nouveau projet.
2. Clique sur **"Recompile"** ou **"Compiler"**.
3. Vérifie que le PDF généré s'affiche sans erreur.

### 2️⃣ **Test en Local**
1. Ouvre un terminal dans ce dossier.
2. Exécute la commande suivante pour compiler un fichier :
   ```bash
   pdflatex -interaction=nonstopmode equations_differentielles.tex
   ```
   ou pour le fichier simple :
   ```bash
   pdflatex -interaction=nonstopmode equations_differentielles_simple.tex
   ```
3. Vérifie que le fichier PDF est généré et qu'il ne contient pas d'erreurs.

### 3️⃣ **Vérification des Dépendances**
- Si tu vois des erreurs liées à des packages manquants (ex : `pgfplots`, `tcolorbox`), installe-les via ton gestionnaire de packages LaTeX :
  - **TeX Live** : `tlmgr install pgfplots tcolorbox`
  - **MiKTeX** : Utilise le **MiKTeX Console** pour installer les packages manquants.

### 4️⃣ **Test des Graphiques (si applicable)**
- Si le fichier contient des graphiques (ex : `equations_differentielles.tex`), assure-toi que :
  - Le compilateur prend en charge `pgfplots`.
  - Aucune erreur de type `Undefined control sequence` n'apparaît.

---

## 📖 Contenu des Fichiers

### 📄 `equations_differentielles.tex`
Ce fichier contient :
- **Théorie** : Définitions et théorèmes sur les équations différentielles du 1er et 2nd ordre, ainsi que les systèmes.
- **Exemples** : Résolution détaillée d'équations différentielles classiques (variables séparables, linéaires, Bernoulli, etc.).
- **Graphiques** : Représentations graphiques des solutions avec `pgfplots` (ex : $y' = -y$, $y'' + y = 0$).
- **Exercices** : 5 exercices proposés avec des solutions à trouver.
- **Systèmes** : Résolution de systèmes d'équations différentielles (ex : Lotka-Volterra simplifié).

**Dépendances LaTeX** :
- `amsmath`, `amssymb`, `amsthm` (pour les maths)
- `tcolorbox` (pour les boîtes colorées)
- `pgfplots` (pour les graphiques)
- `geometry` (pour les marges)
- `hyperref` (pour les liens cliquables)

---

### 📄 `equations_differentielles_simple.tex`
Ce fichier contient :
- **Exemples basiques** : 9 exemples simples d'équations différentielles du 1er et 2nd ordre, ainsi que des systèmes.
- **Solutions détaillées** : Chaque exemple est accompagné d'une solution étape par étape.
- **Format léger** : Pas de graphiques, idéal pour une impression rapide ou une révision.

**Dépendances LaTeX** :
- `amsmath`, `amssymb` (pour les maths)
- `geometry` (pour les marges)

---

## 🎯 Exemples de Contenu

### Équations du 1er Ordre
- **Variables séparables** : $y' = 2xy$ → Solution : $y = C e^{x^2}$
- **Linéaires** : $y' + 2y = 4$ → Solution : $y = 2 + C e^{-2x}$

### Équations du 2nd Ordre
- **À coefficients constants** : $y'' - 3y' + 2y = 0$ → Solution : $y = C_1 e^{2x} + C_2 e^{x}$
- **Non homogènes** : $y'' + y = \sin(x)$ → Solution : $y = C_1 \cos(x) + C_2 \sin(x) - rac{x}{2} \cos(x)$

### Systèmes
- **Système 2x2** :
  $egin{cases} x' = x + y \ y' = -x + y \end{cases}$ → Solution :
  $egin{cases} x = e^{t} (C_1 \cos(t) + C_2 \sin(t)) \ y = e^{t} (-C_1 \sin(t) + C_2 \cos(t)) \end{cases}$

---

## 🔗 Ressources Utiles
- **Overleaf** : [https://www.overleaf.com/](https://www.overleaf.com/)
- **TeX Live** : [https://www.tug.org/texlive/](https://www.tug.org/texlive/)
- **MiKTeX** : [https://miktex.org/](https://miktex.org/)
- **TeXstudio** : [https://www.texstudio.org/](https://www.texstudio.org/)
- **Documentation LaTeX** : [https://www.latex-project.org/](https://www.latex-project.org/)

---

## 📝 Personnalisation
Tu peux modifier ces fichiers pour :
- Ajouter tes propres exemples.
- Changer les couleurs ou le style des boîtes.
- Ajouter des graphiques supplémentaires avec `pgfplots`.
- Inclure des exercices supplémentaires.

---

## 💡 Conseils
- Pour les **graphiques**, utilise `pgfplots` (déjà inclus dans `equations_differentielles.tex`).
- Pour les **équations complexes**, utilise `amsmath` pour un rendu professionnel.
- Pour les **documents longs**, utilise `\newpage` pour organiser le contenu.

---

## 📌 Remarques
- Les fichiers sont encodés en **UTF-8** (compatible avec la plupart des éditeurs modernes).
- Les commentaires dans le code LaTeX (lignes commençant par `%`) expliquent les différentes sections.
- Si tu utilises **Overleaf**, tu peux importer directement ces fichiers dans ton projet.

---

**Bonne compilation !** 🎉

---

## 📜 Licence

Les fichiers de ce dossier (`exemples/`) sont distribués sous la **licence MIT**, en accord avec la licence principale du projet Pi-interface.

> **Texte complet de la licence** : [LICENCE](../LICENSE)

### Résumé des droits :
- ✅ **Utilisation libre** : Tu peux utiliser, copier, modifier et distribuer ces fichiers.
- ✅ **Modifications autorisées** : Tu peux adapter les exemples pour tes besoins.
- ✅ **Usage commercial** : Autorisé sans restriction.
- ❌ **Responsabilité limitée** : Les fichiers sont fournis "en l'état", sans garantie.

### Conditions :
- Inclure une copie de la [LICENCE](../LICENSE) dans toute distribution.
- Conserver les notices de copyright existantes.

*Pour plus de détails, consulte le fichier [LICENSE](../LICENSE) à la racine du projet.*
