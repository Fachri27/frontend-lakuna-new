<script lang="ts">
	function skipToContent(e: MouseEvent) {
		e.preventDefault();
		const el = document.getElementById("main-content");
		if (el) {
			el.setAttribute("tabindex", "-1");
			el.focus();
			el.scrollIntoView({ behavior: "instant" as ScrollBehavior });
		}
	}
</script>

<a href="#main-content" class="skip-link" onclick={skipToContent}>
	Skip to main content
</a>
