<script lang="ts">
	import { decodeTemplate, type Skillbar } from "../lib/util/template";
  import { Professions } from "../lib/util/constants";
  import {skills} from "../lib/util/guild_wars_skills_with_details.json";

  let decodedTemplate:Skillbar|null = null;

  function onSubmit(e: Event) {
    if(!(e.target instanceof HTMLFormElement)) return;
    const formData = new FormData(e.target);

    const data:Record<string,unknown> = {};
    for (let field of formData) {
      const [key, value] = field;
      data[key] = value;
    }
    decodedTemplate=decodeTemplate(data.template)
  }
</script>

<main>
  <form on:submit|preventDefault={onSubmit}>
      <div>
          <label for="template">template</label>
          <input
            type="text"
            id="template"
            name="template"
            value=""
          />
      </div>
     
      <button type="submit">Submit</button>
    </form>
    {#if decodedTemplate}
      <div>
        <p>{Professions[decodedTemplate.primary]}</p>
        <p>{Professions[decodedTemplate.secondary]}</p>


        <ul class="skill-bar">
          {#each decodedTemplate.skills as skill}
            <li class="skill-item">
              <img src={`skills/${skill}.jpg`} alt={skills[skill].name}/>
              <span><b>{skills[skill].name}</b></span>
              <span>{skills[skill].additionalDetails.description}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
</main>

<style>
  .skill-bar {
    display: flex;
    flex-direction: row;
  }
  .skill-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .skill-item img {
    width: 32px;
    height: 32px;
  }

  .skill-item span {
    display: none;
  }

  .skill-item:hover span {
    display: inline;
  }
</style>